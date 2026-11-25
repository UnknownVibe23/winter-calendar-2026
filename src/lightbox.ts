import type { DoorPhoto } from './content';

export interface LightboxDoor {
  n: number;
  text: string;
  photo?: DoorPhoto;
}

export interface LightboxHandle {
  close: () => void;
}

export function lightboxHeader(n: number): string {
  return `Door ${n} — December ${n}`;
}

export function photoDataUrl(photo: DoorPhoto): string {
  return `data:image/jpeg;base64,${photo.data}`;
}

export function openLightbox(root: HTMLElement, door: LightboxDoor): LightboxHandle {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', lightboxHeader(door.n));

  const card = document.createElement('div');
  card.className = 'lightbox';

  const header = document.createElement('p');
  header.className = 'lightbox-header';
  header.textContent = lightboxHeader(door.n);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'lightbox-close';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Close');

  const parts: HTMLElement[] = [header, closeButton];

  if (door.photo !== undefined) {
    const img = document.createElement('img');
    img.className = 'lightbox-photo';
    img.alt = '';
    img.src = photoDataUrl(door.photo);
    parts.push(img);
  }

  const text = document.createElement('p');
  text.className = 'lightbox-text';
  text.textContent = door.text;
  parts.push(text);

  card.append(...parts);
  overlay.append(card);
  root.append(overlay);

  let closed = false;

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function close(): void {
    if (closed) {
      return;
    }
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  document.addEventListener('keydown', onKeydown);
  closeButton.focus();

  return { close };
}
