import Modal from '../../../Modal';

export default async function InterceptedPhoto(
  props: PageProps<'/playground/phase-02-app-router/08-intercepting-routes/photo/[id]'>
) {
  const { id } = await props.params;

  return (
    <Modal>
      <h2>Photo {id} — intercepted, rendered as a modal</h2>
      <p>The gallery is still mounted behind this overlay. The URL bar says /photo/{id}.</p>
    </Modal>
  );
}
