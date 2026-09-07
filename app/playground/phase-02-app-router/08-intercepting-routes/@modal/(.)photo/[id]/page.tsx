import { Suspense } from 'react';
import Modal from '../../../Modal';

export default function InterceptedPhoto(
  props: PageProps<'/playground/phase-02-app-router/08-intercepting-routes/photo/[id]'>
) {
  return (
    <Modal>
      <Suspense fallback={<h2>Loading photo...</h2>}>
        <InterceptedPhotoDetails params={props.params} />
      </Suspense>
    </Modal>
  );
}

async function InterceptedPhotoDetails({
  params,
}: Pick<PageProps<'/playground/phase-02-app-router/08-intercepting-routes/photo/[id]'>, 'params'>) {
  const { id } = await params;

  return (
    <>
      <h2>Photo {id} — intercepted, rendered as a modal</h2>
      <p>The gallery is still mounted behind this overlay. The URL bar says /photo/{id}.</p>
    </>
  );
}
