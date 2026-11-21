import ImageUploader from './ImageUploader';

/** Imagem editável ao lado do título do cartão, com "Remover" quando há imagem. */
export default function CabecalhoComImagem({ titulo, imagem, rotuloRemover, shape, fallback, className = '' }) {
  return (
    <div className={`flex items-center gap-5 ${className}`.trim()}>
      <ImageUploader value={imagem.imagem} onChange={imagem.trocar} onError={imagem.setErro} shape={shape} fallback={fallback} />
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{titulo}</h2>
        {imagem.imagem && (
          <button type="button" onClick={imagem.remover} className="text-xs text-danger hover:underline mt-2 font-medium">
            {rotuloRemover}
          </button>
        )}
      </div>
    </div>
  );
}
