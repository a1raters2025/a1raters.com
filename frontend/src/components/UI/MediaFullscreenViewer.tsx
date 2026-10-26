import React, { useEffect, useState } from 'react';
import { Expand, X } from 'lucide-react';

type MediaFullscreenViewerProps = {
  src: string;
  type: 'image' | 'video';
  title: string;
  children: React.ReactNode;
};

export const MediaFullscreenViewer: React.FC<MediaFullscreenViewerProps> = ({
  src,
  type,
  title,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');

  const openViewer = async () => {
    setIsOpen(true);
    setFullscreenError('');
    if (!document.fullscreenEnabled || document.fullscreenElement) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError('Your browser could not enter fullscreen mode. Use the expand control to view this media.');
    }
  };

  const closeViewer = () => {
    setIsOpen(false);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        setFullscreenError('Unable to exit fullscreen mode. Press Escape to return to the page.');
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeViewer();
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isOpen]);

  return (
    <>
      <div className="group relative">
        {children}
        <button
          type="button"
          onClick={() => void openViewer()}
          aria-label={`View ${title} fullscreen`}
          title="View fullscreen"
          className="absolute bottom-2 right-2 rounded-lg border border-white/20 bg-slate-950/80 p-2 text-white opacity-80 transition hover:bg-slate-800 group-hover:opacity-100 focus:opacity-100"
        >
          <Expand size={17} />
        </button>
      </div>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex flex-col bg-black/95 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} fullscreen`}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeViewer();
          }}
        >
          <div className="flex shrink-0 justify-end">
            <button
              type="button"
              onClick={closeViewer}
              aria-label="Close fullscreen media"
              className="rounded-full border border-white/20 bg-white/10 p-3 text-white hover:bg-white/20"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center py-3">
            {type === 'image' ? (
              <img src={src} alt={title} className="max-h-full max-w-full object-contain" />
            ) : (
              <video
                src={src}
                title={title}
                controls
                autoPlay
                playsInline
                className="max-h-full max-w-full"
              />
            )}
          </div>
          <p className="shrink-0 truncate text-center text-sm text-slate-300">{title}</p>
          {fullscreenError && <p role="status" className="mt-2 text-center text-xs text-amber-200">{fullscreenError}</p>}
        </div>
      )}
    </>
  );
};
