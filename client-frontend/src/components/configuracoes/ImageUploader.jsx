import { useRef } from 'react';
import { erroDaImagem } from '../../utils/configuracoes';

/** Imagem redonda (foto) ou quadrada (logo) com botão de câmera para trocar. */
export default function ImageUploader({ value, onChange, shape = 'circle', size = 96, fallback, onError }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const erro = erroDaImagem(file);
    if (erro) {
      onError?.(erro);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`w-full h-full ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'} overflow-hidden bg-primary-100 flex items-center justify-center border border-divider`}
      >
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : fallback}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Alterar imagem"
        aria-label="Alterar imagem"
        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-600 transition-colors border-2 border-surface"
      >
        <span className="material-icons text-[16px]" aria-hidden="true">photo_camera</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} tabIndex={-1} aria-hidden="true" />
    </div>
  );
}
