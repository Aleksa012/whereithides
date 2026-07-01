import { reddit, context } from '@devvit/web/server';
import { JsonObject } from '@devvit/web/shared';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'whereithides',
  });
};

export const createUserPost = async (
  title: string = 'Find it yall',
  levelData: JsonObject
) => {
  return await reddit.submitCustomPost({
    title: title,
    entry: 'default',
    subredditName: context.subredditName,
    userGeneratedContent: {
      text: 'First post',
    },
    runAs: 'USER',
    postData: levelData,
  });
};
