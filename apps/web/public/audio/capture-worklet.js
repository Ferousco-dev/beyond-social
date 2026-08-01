/**
 * Captures raw microphone samples for the voice recorder.
 *
 * A real file rather than a blob url, because the content security policy
 * allows scripts from 'self' only. Adding blob: to script-src for one small
 * script would widen what the whole app is allowed to execute.
 *
 * Runs on the audio thread and cannot import anything. `inputs[0][0]` is the
 * mono channel, and the buffer it points at is reused after this returns, so
 * the copy is what makes the sample survive the trip.
 */
registerProcessor(
  "capture",
  class extends AudioWorkletProcessor {
    process(inputs) {
      const channel = inputs[0] && inputs[0][0];
      if (channel) this.port.postMessage(new Float32Array(channel));
      return true;
    }
  },
);
