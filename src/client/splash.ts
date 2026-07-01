import { context, requestExpandedMode } from '@devvit/web/client';

const actionButton = document.getElementById(
  'start-button'
) as HTMLButtonElement;
const titleElement = document.getElementById('title') as HTMLHeadingElement;
const descriptionElement = document.getElementById(
  'description'
) as HTMLParagraphElement;
const levelIdElement = document.getElementById(
  'level-id'
) as HTMLParagraphElement;

const hasPost = !!context.postData;
const levelId = context.postId;

function init() {
  titleElement.textContent = 'Where it hides';
  descriptionElement.textContent = hasPost
    ? 'How to play:'
    : `Tap create to make a new level.`;

  actionButton.textContent = hasPost ? 'Play' : 'Create Level';
  actionButton.addEventListener('click', (event) => {
    requestExpandedMode(event, 'game');
  });

  if (levelId) {
    levelIdElement.textContent = `Loaded Level ID: ${levelId}`;
  } else {
    levelIdElement.textContent = 'No level ID loaded';
  }
}

init();
