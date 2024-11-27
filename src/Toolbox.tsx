
import { useState, useEffect, ReactNode } from 'react'

import { ImageLoader } from './widgets'
import { PicastLoImage } from './model/Image';
import { Transformation, TransformationPipeline, Invert } from './model/Transformation'
import { PaintTransformation, Convolution, GrayScale, QuantizeImage, SobelFilter, PointWiseTransformation, Blur, TexturizeTransformation, SelectTransformation } from './model/Transformation';
import { TransformerCard } from './widgets'
import ImageExporter from './widgets/ImageExporter';

const SelectBox = ({ children, selected }: { children: ReactNode, selected: Boolean }) => {
    const myClass = selected ? 'select-box-selected' : 'select-box'
    return <div className={myClass}> {children} </div>
}

interface ToolBoxInterface {
    imgRef: React.MutableRefObject<HTMLImageElement>;
    pipeline: TransformationPipeline;
    setImage: (image: string | null) => void;
    image: string | null;
    addTransform: (index: number, transform: Transformation) => void;
    removeTransform: (index: number) => void;
    selected: number;
    setSelected: (selected: number) => void
}

const sharpening_kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
];

const smooth_kernel = [
    [1 / 9, 1 / 9, 1 / 9],
    [1 / 9, 1 / 9, 1 / 9],
    [1 / 9, 1 / 9, 1 / 9]
];

const transformations: [string, any][] = [
    ["Quantize", () => new QuantizeImage(5)],
    ["GrayScale", () => new GrayScale()],
    ["Conv Sharpen", () => new Convolution(sharpening_kernel, "sharpen")],
    ["Conv Smooth", () => new Convolution(smooth_kernel, "smooth")],
    ["GaussianFilter", () => new Blur()],
    ["Edge Detect", () => new SobelFilter()],
    ["Invert" , () => new Invert() ],
    ["Extract Red", () => new PointWiseTransformation((x) => {
        let [r, g, b, a] = x;
        return [r, 0, 0, a]
    })],
    ["Triangles", () => new TexturizeTransformation("triangle.png", "triangles")],
    ["Waves", () => new TexturizeTransformation("waves.png", "waves")],
    ["Circles", () => new TexturizeTransformation("circle.png", "circles")],
    ["Spheres", () => new TexturizeTransformation("spheres2.png", "spheres")],
    ["Select", () => new SelectTransformation()],
    ["Paint", (imageDimensions: [number, number]) => new PaintTransformation(imageDimensions[0], imageDimensions[1])]
]

interface AddTransformationInterface {
    imageDimensions: [number, number]
    addTransform: (transform: Transformation) => void
}

const SymbolBar = ({handleClick, symbol}:{handleClick:()=>void, symbol:string}) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ cursor: 'grab', display: 'inline-block', marginRight: '10px', verticalAlign: 'middle' }}  onClick={handleClick}>{symbol}</span> 
        <div style={{ display: 'flex', alignItems: 'center' }}>
        <hr
        style={{
            width: '300px',
            marginRight: '10px',
            border: '1px solid white',
            display: 'inline-block',
        }}/>
    </div>
</div>)

const PlusBar = ({ handleClick }: { handleClick: () => void }) => <SymbolBar handleClick={handleClick} symbol={"+"}/>

const MinusBar = ({ handleClick }: { handleClick: () => void }) => <SymbolBar handleClick={handleClick} symbol={"-"} />


//     {/* Plus sign, aligned with the hr */ }
// <span style={{ display: 'inline-block', marginRight: '10px', verticalAlign: 'middle' }}>
//     +
// </span>

const AddTransformation = ({imageDimensions, addTransform}: AddTransformationInterface) => {

    const [open, setOpen] = useState(false)
    const [selection, setSelection] = useState(0)

    const handleAdd = () => { addTransform(transformations[selection][1](imageDimensions)); setOpen(false) }
    const handleCancel = () => { setOpen(false) }

    const handleSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelection(parseInt(event.target.value))
    }

    return <div>
        {!open && <PlusBar handleClick={() => { setOpen(true) }}/>}
        { open &&
            <>
                <MinusBar handleClick={() => { setOpen(false) }} />
                <div>Choose a transformation: </div>
                <div> 
                <select value={selection} onChange={handleSelectionChange}>
                    {
                        transformations.map(
                            (p, i) => <option key={i} value={i}>{p[0]}</option>
                        )
                    }
                </select>
                <button onClick={handleAdd} style={{margin:'10px'}}>Add</button>
                <button onClick={handleCancel}>Cancel</button>
                </div>
            </>
        }
    </div>
}

interface RemoveTransformationInterface {
    name:string;
    removeTransform: () => void
}

const RemoveTransformation = ({ name, removeTransform }: RemoveTransformationInterface) => {
    const [open, setOpen] = useState(false)

    const handleClick = () => { setOpen(true) }
    const handleRemove = () => { removeTransform(); setOpen(false) }
    const handleCancel = () => { setOpen(false) }

    return <div>
        {!open && <div style={{ position: 'absolute' }}><span style={{ cursor: 'grab', height:'0px', position:'relative',top:'0px',left:'300px'}} onClick={handleClick}>x</span></div>}
        {open && <>Remove {name}<button style={{ margin: '10px' }} onClick={handleRemove}>Confirm</button>
            <button onClick={handleCancel}>Cancel</button></>}
    </div>
}

export const ToolBox =
    ({ 
        imgRef,
        pipeline,
        image,
        setImage,
        addTransform,
        removeTransform,
        selected,
        setSelected
    }: ToolBoxInterface) => {

        const [dirty, setDirty] = useState<[boolean, number]>([false, 0])
        const [dims, setDims] = useState<[number, number]>([0, 0])

        // when selected refresh the shown image in the UI
        useEffect(() => setImage(pipeline.getImage(selected)?.dataURL() || null), [selected])

        // When a transformation is changed, we need to reapply transformations
        useEffect(() => {
            if (image) {
                pipeline.performTransformations(dirty[1], transform_step)
                setImage(pipeline.getImage(selected)?.dataURL() || null)
            }
        }, [dirty])

        const transform_step = (i: number) => {
            setSelected(i)
        }

        const setImageAndPipeline = (image: string) => {
            setImage(image)
            new PicastLoImage(null)
                .loadFromString(image)
                .then((p_image: PicastLoImage) => {
                    pipeline.setInitialImage(p_image);
                    setDims([pipeline.getImage(selected)?.width() as number, pipeline.getImage(selected)?.height() as number])
                    console.log("Loaded & Performing")
                    pipeline.performTransformations(0, transform_step)
                })
        }


        return (
          <div className="toolbox-container">
          <SelectBox selected={selected == -1}>
                <ImageLoader onSelect={() => setSelected(-1)} setImage={setImageAndPipeline} />
            </SelectBox>
            {
                pipeline.map((t, i) =>
                    <div key = {i}>
                        <AddTransformation imageDimensions={dims} addTransform={(t) => { if(image) {addTransform(i, t); setDirty([!dirty, i])} }} />
                        <RemoveTransformation name={t.getName()} removeTransform={() => { removeTransform(i); setDirty([!dirty, i]) }} />
                        <SelectBox selected={selected === i}>
                            <TransformerCard imgRef={imgRef} transformation={t} onSelect={() => { setSelected(i) }} setDirty={() => setDirty([!dirty, i])} />
                        </SelectBox> </div>)
            }
            <AddTransformation imageDimensions={dims} addTransform={(t) => { if(image) {addTransform(pipeline.length(), t); setDirty([!dirty, pipeline.length() - 1])} }} />
            <SelectBox selected={selected===pipeline.length()-1}>
                <ImageExporter 
                    onSelect={()=>setSelected(pipeline.length()-1)} 
                    image={pipeline.getOutputImage()}
                    pipeline={pipeline}
                    onLoad={(selected:number) => {setDirty([!dirty, 0]); console.log("to the end."); setSelected(selected)}}
                />
            </SelectBox>
          </div>
        )
    }
