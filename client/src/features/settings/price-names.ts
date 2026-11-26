/** What each priced action is called on the price list, and what one of it means. */
export const PRICE_NAMES: Readonly<Record<string, { readonly name: string; readonly per: string; readonly group: "Videos" | "Editor" | "AI writing" | "Discover" | "People and voices" }>> = {
  video_generate_second: { name: "Generate a video", per: "each second", group: "Videos" },
  video_generate_sound_second: { name: "Generate a video with sound", per: "each second", group: "Videos" },
  video_edit_second: { name: "Edit your own video with AI", per: "each second", group: "Videos" },
  talking_photo_second: { name: "Talking photo", per: "each second", group: "Videos" },
  avatar_video_second: { name: "Avatar video", per: "each second", group: "Videos" },
  video_analysis: { name: "Study a reference video", per: "each video", group: "Videos" },
  storyboard: { name: "Storyboard", per: "each storyboard", group: "Videos" },
  editor_assist: { name: "Ask the editor's AI", per: "each message", group: "Editor" },
  editor_watch: { name: "AI watches your clip", per: "each clip", group: "Editor" },
  editor_captions: { name: "Generate captions", per: "each clip", group: "Editor" },
  image_edit: { name: "Edit a picture with AI", per: "each picture", group: "Editor" },
  autofill: { name: "AI fills in your video", per: "each fill or new length", group: "AI writing" },
  post_caption: { name: "AI writes your post caption", per: "each caption", group: "AI writing" },
  script_write: { name: "AI writes an avatar script", per: "each script", group: "AI writing" },
  chat_message: { name: "Chat with the AI", per: "each message", group: "AI writing" },
  speech_thousand_chars: { name: "Voiceover", per: "each 1,000 characters", group: "People and voices" },
  avatar_training: { name: "Train an avatar", per: "each avatar", group: "People and voices" },
  face: { name: "Add a face", per: "each face", group: "People and voices" },
  voice: { name: "Add a voice", per: "each voice", group: "People and voices" },
  product: { name: "Add a product", per: "each product", group: "People and voices" },
  environment: { name: "Add a place", per: "each place", group: "People and voices" },
  discovery_search: { name: "Search what is trending", per: "each search", group: "Discover" },
};

/** A readable name for an action the list does not know yet, so a new price still shows. */
export function priceName(action: string): { name: string; per: string; group: string } {
  return PRICE_NAMES[action] ?? { name: action.replaceAll("_", " ").replace(/^./u, (c) => c.toUpperCase()), per: "each use", group: "Other" };
}
