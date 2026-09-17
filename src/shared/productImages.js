// Turns the admin product form's photo box into a list of image sources.
// One entry per line; a line may also hold several comma-separated URLs,
// except an uploaded photo (a data: URL), whose base64 part contains a comma.

export function parseImageList(text) {
  return String(text || '')
    .split(/\r?\n/)
    .flatMap(line => (line.trim().startsWith('data:') ? [line] : line.split(',')))
    .map(value => value.trim())
    .filter(Boolean)
}
