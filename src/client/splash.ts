import { context, requestExpandedMode } from '@devvit/web/client';

const actionButton = document.getElementById(
  'start-button'
) as HTMLButtonElement;
const lbButton = document.getElementById('lb-button') as HTMLButtonElement;
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
  titleElement.textContent = 'Where It Hides';
  descriptionElement.textContent = 'How to play:';

  actionButton.textContent = hasPost ? 'Play' : 'Create Level';
  actionButton.addEventListener('click', (event) => {
    requestExpandedMode(event, 'game');
  });

  lbButton.addEventListener('click', (event) => {
    requestExpandedMode(event, 'leaderboard');
  });

  if (levelId) {
    levelIdElement.textContent = `Loaded Level ID: ${levelId}`;
  } else {
    levelIdElement.textContent = 'No level ID loaded';
  }
}

init();
