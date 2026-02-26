import { useState, useEffect } from 'react';
import type { Comment, Reply, CommentWidgetProps, SupabaseConfig } from './types';
import { ChatIcon, CloseIcon, TrashIcon, ViewIcon, ViewOffIcon, UserIcon, ReplyIcon, GearIcon } from './icons';
import { COMMENT_STYLES } from './styles';
import { CommentAPI } from './api';
import { SetupWizard } from './SetupWizard';

/**
 * Drop-in visual commenting widget.
 *
 * Usage:
 *   <CommentWidget />
 *
 * On first use, a setup wizard prompts the user to connect Supabase or
 * choose local-only mode. Credentials are remembered in localStorage.
 *
 * Or skip the wizard by passing credentials directly:
 *   <CommentWidget supabaseUrl="https://xxx.supabase.co" supabaseAnonKey="eyJ..." />
 */
export function CommentWidget({
  supabaseUrl,
  supabaseAnonKey,
  tableName = 'pin_comments',
  storagePrefix = 'pin-comments:',
  position = 'bottom-right',
}: CommentWidgetProps) {
  // ── Setup state ──────────────────────────────────────────────
  const [showSetup, setShowSetup] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(() => {
    // Props take priority
    if (supabaseUrl && supabaseAnonKey) {
      return { url: supabaseUrl, anonKey: supabaseAnonKey };
    }
    // Check localStorage
    try {
      const saved = localStorage.getItem(`${storagePrefix}supabase-config`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [mode, setMode] = useState<'supabase' | 'local'>(() => {
    if (supabaseUrl && supabaseAnonKey) return 'supabase';
    try {
      const savedMode = localStorage.getItem(`${storagePrefix}mode`);
      if (savedMode === 'local') return 'local';
      const saved = localStorage.getItem(`${storagePrefix}supabase-config`);
      if (saved) return 'supabase';
    } catch {}
    return 'local'; // default until setup runs
  });
  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(() => {
    if (supabaseUrl && supabaseAnonKey) return true;
    try {
      return !!(
        localStorage.getItem(`${storagePrefix}supabase-config`) ||
        localStorage.getItem(`${storagePrefix}mode`) === 'local'
      );
    } catch {}
    return false;
  });

  const api = supabaseConfig ? new CommentAPI(supabaseConfig, tableName) : null;

  // ── Comment state ────────────────────────────────────────────
  const [isActive, setIsActive] = useState(false);
  const [allComments, setAllComments] = useState<Comment[]>(() => {
    try {
      const cached = localStorage.getItem(`${storagePrefix}comments-cache`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(window.location.pathname);

  // ── Author state ─────────────────────────────────────────────
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(`${storagePrefix}user-name`) || '';
  });
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // ── Reply state ──────────────────────────────────────────────
  const [replyText, setReplyText] = useState('');

  // ── Derived ──────────────────────────────────────────────────
  const comments = allComments.filter(c => c.page === currentPage);

  // ── Effects ──────────────────────────────────────────────────
  // Cache to localStorage
  useEffect(() => {
    localStorage.setItem(`${storagePrefix}comments-cache`, JSON.stringify(allComments));
  }, [allComments, storagePrefix]);

  // Track SPA page changes
  useEffect(() => {
    const handleLocationChange = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPage) {
        setCurrentPage(newPath);
        setIsActive(false);
        setShowSidebar(false);
        setSelectedComment(null);
        setNewCommentPosition(null);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    const interval = setInterval(handleLocationChange, 100);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, [currentPage]);

  // Fetch from Supabase on mount
  useEffect(() => {
    if (mode === 'supabase' && api) {
      api.fetchComments()
        .then(fetched => {
          setAllComments(prev => {
            const fetchedIds = new Set(fetched.map(c => c.id));
            const localOnly = prev.filter(c => !fetchedIds.has(c.id));
            return [...fetched, ...localOnly];
          });
        })
        .catch(err => console.error('Pin Comments: fetch error', err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [mode, supabaseConfig]);

  // Reset on deactivate
  useEffect(() => {
    if (!isActive) {
      setNewCommentPosition(null);
      setSelectedComment(null);
    }
  }, [isActive]);

  // Clear reply text on comment switch
  useEffect(() => {
    setReplyText('');
  }, [selectedComment]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleActivate = () => {
    if (!hasCompletedSetup) {
      setShowSetup(true);
      return;
    }
    if (!userName) {
      setNameInput('');
      setShowNamePrompt(true);
      return;
    }
    setIsActive(true);
    setShowSidebar(true);
  };

  const handlePageClick = (e: React.MouseEvent) => {
    if (!isActive) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('.pin-comment-pin') ||
      target.closest('.pin-comment-sidebar') ||
      target.closest('.pin-comment-toggle') ||
      target.closest('.pin-comment-popup')
    ) return;

    const x = e.clientX + window.scrollX;
    const y = e.clientY + window.scrollY;
    setNewCommentPosition({ x, y });
    setCommentText('');
  };

  const addComment = async () => {
    if (!newCommentPosition || !commentText.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      x: newCommentPosition.x,
      y: newCommentPosition.y,
      text: commentText.trim(),
      timestamp: new Date().toISOString(),
      page: currentPage,
      author: userName || undefined,
      replies: [],
    };

    setAllComments(prev => [...prev, comment]);
    setNewCommentPosition(null);
    setCommentText('');
    setShowSidebar(true);

    if (api) {
      try {
        await api.addComment(comment);
      } catch (err) {
        console.error('Pin Comments: failed to save comment', err);
      }
    }
  };

  const deleteComment = async (id: string) => {
    const prev = allComments;
    setAllComments(allComments.filter(c => c.id !== id));
    if (selectedComment === id) setSelectedComment(null);

    if (api) {
      try {
        await api.deleteComment(id);
      } catch (err) {
        console.error('Pin Comments: failed to delete', err);
        setAllComments(prev);
      }
    }
  };

  const addReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    const reply: Reply = {
      id: Date.now().toString(),
      text: replyText.trim(),
      author: userName || undefined,
      timestamp: new Date().toISOString(),
    };

    const updated = allComments.map(c =>
      c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c
    );
    setAllComments(updated);
    setReplyText('');

    if (api) {
      const comment = updated.find(c => c.id === commentId);
      if (comment) {
        try {
          await api.updateComment(commentId, { replies: comment.replies });
        } catch (err) {
          console.error('Pin Comments: failed to save reply', err);
        }
      }
    }
  };

  const deleteReply = async (commentId: string, replyId: string) => {
    const updated = allComments.map(c =>
      c.id === commentId
        ? { ...c, replies: (c.replies || []).filter(r => r.id !== replyId) }
        : c
    );
    setAllComments(updated);

    if (api) {
      const comment = updated.find(c => c.id === commentId);
      if (comment) {
        try {
          await api.updateComment(commentId, { replies: comment.replies });
        } catch (err) {
          console.error('Pin Comments: failed to delete reply', err);
        }
      }
    }
  };

  const saveUserName = () => {
    if (!nameInput.trim()) return;
    const name = nameInput.trim();
    setUserName(name);
    localStorage.setItem(`${storagePrefix}user-name`, name);
    setShowNamePrompt(false);
    setIsActive(true);
    setShowSidebar(true);
  };

  const handleSetupComplete = (config: SupabaseConfig | null) => {
    if (config) {
      setSupabaseConfig(config);
      setMode('supabase');
    } else {
      setMode('local');
    }
    setHasCompletedSetup(true);
    setShowSetup(false);
    // After setup, prompt for name then activate
    if (!userName) {
      setNameInput('');
      setShowNamePrompt(true);
    } else {
      setIsActive(true);
      setShowSidebar(true);
    }
  };

  const resetSetup = () => {
    localStorage.removeItem(`${storagePrefix}supabase-config`);
    localStorage.removeItem(`${storagePrefix}mode`);
    setSupabaseConfig(null);
    setMode('local');
    setHasCompletedSetup(false);
    setShowSetup(true);
  };

  // ── FAB position ─────────────────────────────────────────────
  const fabPosition = position === 'bottom-left'
    ? { bottom: '2rem', left: '2rem' }
    : { bottom: '2rem', right: '2rem' };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      <style>{COMMENT_STYLES}</style>

      {/* Setup Wizard */}
      {showSetup && (
        <SetupWizard
          storagePrefix={storagePrefix}
          tableName={tableName}
          onComplete={handleSetupComplete}
          onCancel={() => setShowSetup(false)}
        />
      )}

      {/* Crosshair overlay when active */}
      {isActive && (
        <div
          onClick={handlePageClick}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9998,
            cursor: 'crosshair',
            pointerEvents: 'all',
          }}
        />
      )}

      {/* Floating action button */}
      <div className="pin-comment-toggle" style={{ position: 'fixed', ...fabPosition, zIndex: 10001 }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Settings gear — only if setup has been completed */}
          {hasCompletedSetup && (
            <button
              className="pin-comment-button pin-comment-button-ghost pin-comment-button-icon-only"
              onClick={resetSetup}
              title="Change storage settings"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', backgroundColor: 'white' }}
            >
              <GearIcon />
            </button>
          )}
          {comments.length > 0 && (
            <button
              className="pin-comment-button pin-comment-button-secondary pin-comment-button-icon-only"
              onClick={() => setCommentsVisible(!commentsVisible)}
              title={commentsVisible ? 'Hide pins' : 'Show pins'}
            >
              {commentsVisible ? <ViewOffIcon /> : <ViewIcon />}
            </button>
          )}
          <button
            className={`pin-comment-button ${isActive ? 'pin-comment-button-primary' : 'pin-comment-button-tertiary'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (isActive) {
                setIsActive(false);
              } else {
                handleActivate();
              }
            }}
            style={{ pointerEvents: 'auto' }}
          >
            <ChatIcon />
            {isActive ? 'Exit Comment Mode' : 'Add Comments'}
          </button>
        </div>
      </div>

      {/* Absolute pin container — scrolls with page content */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        {/* Comment pins */}
        {commentsVisible && comments.map((comment, index) => (
          <div
            key={comment.id}
            className="pin-comment-pin"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedComment(comment.id);
              setShowSidebar(true);
            }}
            style={{
              position: 'absolute',
              left: `${comment.x}px`,
              top: `${comment.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: selectedComment === comment.id ? '#da1e28' : '#0f62fe',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
              pointerEvents: 'auto',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'; }}
          >
            {index + 1}
          </div>
        ))}

        {/* New comment popup */}
        {newCommentPosition && (
          <div
            className="pin-comment-popup"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: `${newCommentPosition.x}px`,
              top: `${newCommentPosition.y}px`,
              transform: 'translate(-50%, -100%) translateY(-20px)',
              zIndex: 10000,
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1rem',
              minWidth: '300px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'auto',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '14px' }}>Add Comment</div>
            <textarea
              className="pin-comment-textarea"
              placeholder="Enter your comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                  e.preventDefault();
                  addComment();
                }
              }}
              rows={3}
              style={{ marginBottom: '0.75rem' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="pin-comment-button pin-comment-button-secondary pin-comment-button-sm"
                onClick={() => { setNewCommentPosition(null); setCommentText(''); }}
              >
                Cancel
              </button>
              <button
                className="pin-comment-button pin-comment-button-primary pin-comment-button-sm"
                onClick={addComment}
                disabled={!commentText.trim()}
              >
                Add Comment
              </button>
            </div>
            <div style={{
              position: 'absolute',
              left: '50%', bottom: '-28px',
              transform: 'translateX(-50%)',
              width: '24px', height: '24px',
              borderRadius: '50%',
              backgroundColor: '#0f62fe',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '12px',
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}>
              {comments.length + 1}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      {showSidebar && (comments.length > 0 || isActive) && (
        <div
          className="pin-comment-sidebar"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            right: 0, top: 0, bottom: 0,
            width: '350px',
            backgroundColor: 'white',
            borderLeft: '1px solid #e0e0e0',
            zIndex: 10000,
            overflowY: 'auto',
            boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* Sidebar header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 1,
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                Comments ({comments.length})
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#525252' }}>
                {isActive ? 'Click anywhere to add a comment' : 'Enable comment mode to add more'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {comments.length > 0 && (
                <button
                  className="pin-comment-button pin-comment-button-ghost pin-comment-button-icon-only pin-comment-button-sm"
                  onClick={() => setCommentsVisible(!commentsVisible)}
                  title={commentsVisible ? 'Hide pins' : 'Show pins'}
                >
                  {commentsVisible ? <ViewOffIcon /> : <ViewIcon />}
                </button>
              )}
              <button
                className="pin-comment-button pin-comment-button-ghost pin-comment-button-icon-only pin-comment-button-sm"
                onClick={() => setShowSidebar(false)}
                title="Close sidebar"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Comment list */}
          <div style={{ padding: '1rem' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#525252' }}>
                <div style={{ marginBottom: '1rem', opacity: 0.3 }}><ChatIcon /></div>
                <p>Loading comments...</p>
              </div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#525252' }}>
                <div style={{ marginBottom: '1rem', opacity: 0.3 }}><ChatIcon /></div>
                <p>No comments yet on this page.</p>
                <p style={{ fontSize: '14px' }}>
                  {isActive ? 'Click anywhere to add your first comment!' : 'Enable comment mode to get started.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {comments.map((comment, index) => {
                  const isSelected = selectedComment === comment.id;
                  const replyCount = comment.replies?.length || 0;

                  return (
                    <div
                      key={comment.id}
                      onClick={() => setSelectedComment(isSelected ? null : comment.id)}
                      style={{
                        padding: isSelected ? '1rem' : '0.75rem',
                        backgroundColor: isSelected ? '#e5f6ff' : '#f4f4f4',
                        border: `1px solid ${isSelected ? '#0f62fe' : '#e0e0e0'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                        <div style={{
                          width: '24px', height: '24px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#da1e28' : '#0f62fe',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          flexShrink: 0,
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {isSelected ? (
                            <>
                              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                {comment.text}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                {comment.author && (
                                  <span style={{ fontSize: '12px', color: '#525252', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <UserIcon /> {comment.author}
                                  </span>
                                )}
                                <span style={{ fontSize: '12px', color: '#8d8d8d' }}>
                                  {new Date(comment.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p style={{
                                margin: 0, fontSize: '13px', lineHeight: '1.4',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {comment.text}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                {comment.author && (
                                  <span style={{ fontSize: '11px', color: '#525252', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <UserIcon /> {comment.author}
                                  </span>
                                )}
                                {replyCount > 0 && (
                                  <span style={{
                                    fontSize: '11px', color: '#0f62fe',
                                    display: 'flex', alignItems: 'center', gap: '0.2rem',
                                    fontWeight: 500,
                                  }}>
                                    <ReplyIcon />
                                    {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          className="pin-comment-button pin-comment-button-ghost pin-comment-button-icon-only pin-comment-button-sm"
                          onClick={(e) => { e.stopPropagation(); deleteComment(comment.id); }}
                          title="Delete comment"
                          style={{ flexShrink: 0 }}
                        >
                          <TrashIcon />
                        </button>
                      </div>

                      {/* Expanded: replies + reply input */}
                      {isSelected && (
                        <>
                          {replyCount > 0 && (
                            <div style={{ marginTop: '0.75rem', marginLeft: '2.25rem', borderLeft: '2px solid #d0d0d0', paddingLeft: '0.75rem' }}>
                              {comment.replies!.map(reply => (
                                <div key={reply.id} style={{
                                  padding: '0.5rem 0',
                                  borderBottom: '1px solid #e0e0e0',
                                  display: 'flex',
                                  alignItems: 'start',
                                  gap: '0.5rem',
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>{reply.text}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                      {reply.author && (
                                        <span style={{ fontSize: '11px', color: '#525252', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <UserIcon /> {reply.author}
                                        </span>
                                      )}
                                      <span style={{ fontSize: '11px', color: '#8d8d8d' }}>
                                        {new Date(reply.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    className="pin-comment-button pin-comment-button-ghost pin-comment-button-icon-only pin-comment-button-sm"
                                    onClick={(e) => { e.stopPropagation(); deleteReply(comment.id, reply.id); }}
                                    title="Delete reply"
                                    style={{ flexShrink: 0, padding: '0.25rem' }}
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ marginTop: '0.5rem', marginLeft: '2.25rem', paddingLeft: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                              <textarea
                                className="pin-comment-textarea"
                                placeholder="Reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                                    e.preventDefault();
                                    addReply(comment.id);
                                  }
                                }}
                                rows={1}
                                style={{ flex: 1, fontSize: '13px', padding: '0.5rem' }}
                              />
                              <button
                                className="pin-comment-button pin-comment-button-primary pin-comment-button-sm"
                                onClick={(e) => { e.stopPropagation(); addReply(comment.id); }}
                                disabled={!replyText.trim()}
                                style={{
                                  flexShrink: 0,
                                  padding: '0.5rem 0.75rem',
                                }}
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Name prompt modal */}
      {showNamePrompt && (
        <>
          <div
            onClick={() => setShowNamePrompt(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 10001,
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10002,
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '1.5rem',
              minWidth: '340px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <UserIcon />
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>What's your name?</span>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '13px', color: '#525252' }}>
              Your name will be attached to comments you leave.
            </p>
            <input
              className="pin-comment-input"
              placeholder="Enter your name..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) saveUserName(); }}
              autoFocus
              style={{ marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="pin-comment-button pin-comment-button-secondary pin-comment-button-sm"
                onClick={() => setShowNamePrompt(false)}
              >
                Cancel
              </button>
              <button
                className="pin-comment-button pin-comment-button-primary pin-comment-button-sm"
                onClick={saveUserName}
                disabled={!nameInput.trim()}
              >
                Continue
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}