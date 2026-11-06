/**
 * Any other route closes the modal. A slot keeps its last page on client-side
 * navigation, so without this a link out of the modal would leave it open.
 */
export default function NoModal() {
  return null;
}
