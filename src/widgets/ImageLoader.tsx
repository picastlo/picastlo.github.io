import { useState } from "react";
import { Foldable } from "./Utils";

const ImageLoader = ({ onSelect, setImage }: { onSelect: () => void, setImage: (image: string) => void }) => {

    const [filename, setFilename] = useState<string | undefined>(undefined)

    const handleImageLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setFilename(file?.name)
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                setImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="widget-card" onClick={onSelect}>
            <Foldable title={`Original Image ${filename===undefined?"":"("+filename+")"}`}>
                <input type="file" accept="image/*" onChange={handleImageLoad} />
            </Foldable>
        </div>
    )
}

export default ImageLoader