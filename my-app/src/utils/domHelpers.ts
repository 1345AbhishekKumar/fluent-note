// DOM & caret selection utilities extracted from utils/index.ts

export function isCaretAtStart(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(el);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    return preCaretRange.toString().length === 0;
  }
  return false;
}

export function moveCaret(el: HTMLElement, toStart: boolean = false) {
  el.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  if (sel) {
    range.selectNodeContents(el);
    range.collapse(toStart);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function setEdBodyHtml(edBody: HTMLElement, newHtml: string) {
  if (!edBody) return;

  // Parse new HTML into a temporary container
  const temp = document.createElement('div');
  temp.innerHTML = newHtml;

  const newBlocks = Array.from(temp.querySelectorAll('.block-wrapper')) as HTMLElement[];
  const oldBlocksMap = new Map<string, HTMLElement>();
  
  // Build a map of existing block wrappers in edBody
  edBody.querySelectorAll('.block-wrapper').forEach(node => {
    const bEl = node as HTMLElement;
    const id = bEl.dataset.id;
    if (id) oldBlocksMap.set(id, bEl);
  });

  const newChildren: HTMLElement[] = [];

  newBlocks.forEach(newBlock => {
    const id = newBlock.dataset.id;
    if (!id) return;

    const oldBlock = oldBlocksMap.get(id);
    if (oldBlock) {
      // Detect media blocks either by data-type or by presence of media child elements
      const newMedia = newBlock.querySelector('iframe, video, audio, img') as Element | null;
      const oldMedia = oldBlock.querySelector('iframe, video, audio, img') as Element | null;

      const mediaTagsByType: Record<string, string> = {
        pdf: 'iframe', video: 'video', audio: 'audio', image: 'img'
      };
      const dataType = newBlock.dataset.type || '';
      const expectedTag = mediaTagsByType[dataType] || '';

      // A block is treated as media if its data-type is a media type, OR if it contains a media element
      const isMedia = (expectedTag !== '' && newMedia?.tagName.toLowerCase() === expectedTag)
        || (newMedia !== null && oldMedia !== null && newMedia.tagName === oldMedia.tagName);

      if (isMedia && newMedia && oldMedia) {
        // Use getAttribute to get the raw src string, avoiding JSDOM absolute URL resolution
        const oldSrc = oldMedia.getAttribute('src') || '';
        const newSrc = newMedia.getAttribute('src') || '';

        if (oldSrc === newSrc && oldSrc !== '') {
          // Sync classes and inline styles from the new wrapper to the preserved old one
          oldBlock.className = newBlock.className;
          oldBlock.style.cssText = newBlock.style.cssText;

          newChildren.push(oldBlock);
          return;
        }
      }
    }

    newChildren.push(newBlock);
  });

  // Reconcile edBody children with newChildren in-place to prevent iframe reload
  let currentChild = edBody.firstElementChild;
  
  for (let i = 0; i < newChildren.length; i++) {
    const targetChild = newChildren[i];
    
    if (currentChild === targetChild) {
      currentChild = currentChild.nextElementSibling;
    } else {
      const isCurrentChildNeededLater = currentChild && newChildren.slice(i).includes(currentChild as HTMLElement);
      if (isCurrentChildNeededLater) {
        edBody.insertBefore(targetChild, currentChild!);
      } else {
        if (currentChild) {
          const toRemove = currentChild;
          currentChild = currentChild.nextElementSibling;
          toRemove.remove();
          i--; // Compare the same targetChild with the next currentChild
        } else {
          edBody.appendChild(targetChild);
        }
      }
    }
  }
  
  // Remove any remaining trailing old children in edBody
  while (currentChild) {
    const toRemove = currentChild;
    currentChild = currentChild.nextElementSibling;
    toRemove.remove();
  }
}
