// A drag that ends over a cell/strip still makes Konva fire that shape's "click"
// right after the stage's mouseup (both in the same event). The Selection tools'
// rectangle/stroke has already done its job by then, so the click must not also
// toggle the item under the cursor. Viewport flags the gesture as a drag on
// mouseup; click handlers ask. The flag clears itself once the event is over.
let dragged = false;

export function flagDragGesture() {
  dragged = true;
  setTimeout(() => { dragged = false; }, 0);
}

export function wasDragGesture() {
  return dragged;
}
