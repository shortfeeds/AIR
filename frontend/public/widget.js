(function() {
  const script = document.currentScript;
  const clientId = script.getAttribute('data-client-id');
  const baseUrl = script.getAttribute('data-base-url') || 'https://air.trinitypixels.in';

  if (!clientId) {
    console.error('Trinity Pixels Widget: Missing data-client-id');
    return;
  }

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #tp-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #6366f1;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999999;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
    }
    #tp-widget-btn:hover {
      transform: scale(1.1) translateY(-4px);
      box-shadow: 0 8px 30px rgba(99, 102, 241, 0.6);
    }
    #tp-widget-btn svg {
      width: 28px;
      height: 28px;
      color: white;
    }
  `;
  document.head.appendChild(style);

  // Create button
  const btn = document.createElement('button');
  btn.id = 'tp-widget-btn';
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
  `;

  btn.onclick = function() {
    const width = 450;
    const height = 700;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      `${baseUrl}/call/${clientId}`,
      'TrinityPixelsCall',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
  };

  document.body.appendChild(btn);
})();
