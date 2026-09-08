import Image from "next/image";
import photo from "../local-photo.jpg";

export default function LocalStaticImportPage() {
  return (
    <div>
      <h1>Local, Statically Imported Image</h1>
      <p>
        No <code>width</code>/<code>height</code>/<code>blurDataURL</code> passed explicitly — all
        three are inferred automatically from the imported file. View source for the real{" "}
        <code>width</code>/<code>height</code> attributes and the <code>data:</code>-URL blur
        placeholder.
      </p>
      <Image src={photo} alt="A photo, statically imported" placeholder="blur" />
    </div>
  );
}
