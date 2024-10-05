import { PicastLoImage } from '../model/Image';
import { Renderer } from '../model/Transformation'


function save(filename: string, data: BlobPart) {
    const blob = new Blob([data], { type: 'text/csv' });
    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
}

export const OBJExporter = ({ outputImage }: { outputImage: PicastLoImage | null }) => {

    const saveObj = () => {
        if (!outputImage) return;
        let renderer = new Renderer(outputImage, outputImage, 1);
        let raw: string = renderer.render();
        save('output.obj', raw);
    }

    return <div>
        <button className="button button-dark" onClick={saveObj}>Export to OBJ</button>
    </div>
}

async function send(image: string): Promise<string> {
    return fetch("/piscastlo", { method: "POST", body: btoa(image) })
        .then(req => req.json())
}

export const BlenderExporter = ({ outputImage }: { outputImage: PicastLoImage | null }) => {

    const saveObj = () => {
        if (!outputImage) return;
        let renderer = new Renderer(outputImage, outputImage, 2);
        let raw: string = renderer.render();
        send(raw).then((data: string) => { save('output.stl', atob(data)) });
    }

    return <div>
        <button className="button button-dark" onClick={saveObj}>Export to STL</button>
    </div>
}

export const SVGExporter = () => <div></div>