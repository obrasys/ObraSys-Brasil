import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useUploadPmeProjectPhoto } from "../hooks/usePmeProjectMutations";
import { pmeProjectPhotoSchema } from "../pmeProjectSchemas";
import type { PmeProjectPhoto, PmeProjectSnapshot } from "../pmeProjectUiTypes";

type PhotoFormValues = Omit<PmeProjectPhoto, "id">;

export function PmeProjectPhotosTab({ snapshot }: { snapshot: PmeProjectSnapshot }) {
  const uploadPhoto = useUploadPmeProjectPhoto(snapshot.project.id);
  const form = useForm<PhotoFormValues>({
    resolver: zodResolver(pmeProjectPhotoSchema.omit({ id: true })),
    defaultValues: {
      fileUrl: "",
      fileName: "",
      caption: "",
      takenAt: new Date().toISOString().slice(0, 10)
    }
  });

  return (
    <section className="tab-panel" aria-labelledby="photos-title">
      <div className="section-heading">
        <div>
          <h2 id="photos-title">Fotos e anexos</h2>
          <p>Guarde registros da obra com legenda e vinculo operacional.</p>
        </div>
      </div>
      <form
        className="quick-form horizontal-form"
        onSubmit={form.handleSubmit((values) => {
          uploadPhoto.mutate(values);
          form.reset();
        })}
      >
        <input placeholder="URL do arquivo" {...form.register("fileUrl")} />
        <input placeholder="Nome do arquivo" {...form.register("fileName")} />
        <input placeholder="Legenda" {...form.register("caption")} />
        <button className="primary-button" type="submit">
          Adicionar foto
        </button>
      </form>
      {snapshot.photos.length === 0 ? (
        <div className="empty-state">Nenhuma foto adicionada.</div>
      ) : (
        <div className="photo-grid">
          {snapshot.photos.map((photo) => (
            <figure key={photo.id}>
              <img src={photo.fileUrl} alt={photo.caption ?? photo.fileName} />
              <figcaption>{photo.caption ?? photo.fileName}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
