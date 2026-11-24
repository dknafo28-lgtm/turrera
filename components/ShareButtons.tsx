// Share a lot by WhatsApp, text message, email or a copied link. Plain links, so they work without JavaScript.
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const text = `${title} ${url}`;
  return (
    <div className="share" aria-label="Share this lot">
      <span className="share-label">Share</span>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>
        <span>WhatsApp</span>
      </a>
      <a href={`sms:?&body=${encodeURIComponent(text)}`} aria-label="Share by text message">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M4 5h16v11H9l-5 4z" /></svg>
        <span>Text</span>
      </a>
      <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`} aria-label="Share by email">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="none" stroke="currentColor" strokeWidth="1.8" d="M3 6h18v12H3zM3 7l9 6 9-6" /></svg>
        <span>Email</span>
      </a>
      <button type="button" data-copy={url} aria-label="Copy link">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="none" stroke="currentColor" strokeWidth="1.8" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
        <span data-copy-label>Copy link</span>
      </button>
    </div>
  );
}
