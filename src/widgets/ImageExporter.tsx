import { useState } from "react";
import { Foldable } from "./Utils";
import { BlenderExporter, OBJExporter } from "./Exporters";
import { PicastLoImage } from "../model/Image";

const ImageExporter = ({ onSelect, image }: { onSelect: () => void, image:PicastLoImage|null }) => {

    return (
        <div className="widget-card" onClick={onSelect}>
            <Foldable title={`Final Image`}>
                <OBJExporter outputImage={image} />
                <BlenderExporter outputImage={image} />
            </Foldable>
        </div>
    )
}

export default ImageExporter