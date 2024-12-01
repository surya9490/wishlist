export default function SaveBar() {
  return (
    <ui-save-bar id="my-save-bar">
      <button variant="primary" id="save-button"></button>
      <button id="discard-button"></button>
    </ui-save-bar>
  )
}

document.getElementById('save-button').addEventListener('click', () => {
  console.log('Saving');
  document.getElementById('my-save-bar').hide();
});

document.getElementById('discard-button').addEventListener('click', () => {
  console.log('Discarding');
  document.getElementById('my-save-bar').hide();
});