export const COMMENT_STYLES = `
  .pin-comment-button {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 0.75rem 1.25rem;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    line-height: 1;
  }
  .pin-comment-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
  .pin-comment-button:active {
    transform: translateY(0);
  }
  .pin-comment-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  }
  .pin-comment-button-primary {
    background-color: #0f62fe;
    color: white;
  }
  .pin-comment-button-primary:hover:not(:disabled) {
    background-color: #0353e9;
  }
  .pin-comment-button-secondary {
    background-color: #393939;
    color: white;
  }
  .pin-comment-button-secondary:hover:not(:disabled) {
    background-color: #4c4c4c;
  }
  .pin-comment-button-tertiary {
    background-color: white;
    color: #161616;
    border: 1px solid #e0e0e0;
  }
  .pin-comment-button-tertiary:hover:not(:disabled) {
    background-color: #f4f4f4;
  }
  .pin-comment-button-icon-only {
    padding: 0.75rem;
  }
  .pin-comment-button-sm {
    padding: 0.5rem 1rem;
    font-size: 13px;
  }
  .pin-comment-button-ghost {
    background: transparent;
    color: #161616;
    box-shadow: none;
  }
  .pin-comment-button-ghost:hover:not(:disabled) {
    background-color: #e0e0e0;
  }
  .pin-comment-textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #8d8d8d;
    border-radius: 0.25rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  }
  .pin-comment-textarea:focus {
    border-color: #0f62fe;
    box-shadow: 0 0 0 1px #0f62fe;
  }
  .pin-comment-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #8d8d8d;
    border-radius: 0.25rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
  }
  .pin-comment-input:focus {
    border-color: #0f62fe;
    box-shadow: 0 0 0 1px #0f62fe;
  }
`;
