// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo
// loaded; ?shot=cover shows the cover alone, filling the viewport. `photo` picks
// the sample, `caption` the title, `script` the pink script line under it, and
// `layout` / `grade` the look.
// window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, app) {
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const script = query.get('script') ?? 'Neon Tide';
  const layout = query.get('layout');
  const grade = query.get('grade');
  if (layout) app.setLayout(layout);
  if (grade) app.setGrade(grade);
  await app.preloadSamples();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    await app.showCoverShot(photo, caption, script);
  } else {
    await app.showEditorShot(photo, caption, script);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
