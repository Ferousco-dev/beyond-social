const NAMES: Readonly<Record<string, string>> = {
  discovery_search: "Discover search",
  chat_message: "Chat message",
  video_analysis: "Watching a link video",
  video_generate_second: "Making a video, no sound",
  video_generate_sound_second: "Making a video, with sound",
  "video_transform:5:720p": "Remixing a video, 5 seconds, 720p",
  "video_transform:5:1080p": "Remixing a video, 5 seconds, 1080p",
  "video_transform:10:720p": "Remixing a video, 10 seconds, 720p",
  "video_transform:10:1080p": "Remixing a video, 10 seconds, 1080p",
  editor_assist: "Editor assistant message",
  editor_captions: "Editor captions",
  editor_watch: "Editor watches a clip",
  image_edit: "Editing a picture",
  talking_photo_second: "Talking photo",
  speech_thousand_chars: "Speech",
};

export function actionName(action: string): string {
  return NAMES[action] ?? action.replaceAll("_", " ");
}
