import React, { useRef, useState, useEffect, MouseEvent, TouchEvent } from 'react'
import { Foldable, toRGBColor } from './Utils';

enum Tool {
    Brush = 'BRUSH',
    Eraser = 'ERASER'
}

export const ImageEditor = ({mask, imgRef, onChange} : {mask :ImageData, imgRef:React.MutableRefObject<HTMLImageElement>, onChange:(input:ImageData) => void}) => {
    const [canvasOpacity, setCanvasOpacity] = useState(100)
    const [brushColor, setBrushColor] = useState('#000000')
    const [brushAlpha, setBrushAlpha] = useState(100)
    const [brushSize, setBrushSize] = useState(5)
    const [tool, setTool] = useState(Tool.Brush)

    const updateCanvasOpacity = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCanvasOpacity(parseInt(event.target.value))
    }

    const updateBrushColor = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBrushColor(event.target.value)
    }

    const updateBrushSize = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBrushSize(parseInt(event.target.value))
    }

    const updateBrushAlpha = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBrushAlpha(parseInt(event.target.value))
    }


    const editorRef = useRef(null as unknown as HTMLDivElement)
    const canvasRef = useRef(null as unknown as HTMLCanvasElement)
    

    useEffect(() => {
        const canvas = canvasRef.current
        canvas.width = mask.width
        canvas.height = mask.height

        const ctx = canvas.getContext('2d')
        if(!ctx)
            throw Error()

        ctx.putImageData(mask, 0, 0)
    }, [mask])


    let painting = false;

    const startDrawing = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        
        if(!ctx)
            return
    
        painting = true
    } 

    const onMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
        startDrawing()

        onMouseMove(event)
    }

    const onTouchStart = (event: TouchEvent<HTMLCanvasElement>) => {
        event.preventDefault()

        if(event.touches.length != 1)
            return
        
        startDrawing()

        onTouchMove(event)
    }


    const moveDrawing = (x:number, y:number) => { 
        const ctx = canvasRef.current.getContext('2d')

        if(!ctx || !painting)
            return

        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';

        switch(tool) {
            case Tool.Brush:
                ctx.globalCompositeOperation = "source-over"
                const brushRGBColor = toRGBColor(brushColor)
                ctx.strokeStyle = 'rgba(' + brushRGBColor[0] +','+ brushRGBColor[1] +','+ brushRGBColor[2] +','+ brushAlpha/100 + ')';
                break;
            case Tool.Eraser:
                ctx.globalCompositeOperation = 'destination-out'
                ctx.strokeStyle = 'rgba(127,127,127,1)';
                break;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }


    const onMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current

        moveDrawing(
            Math.ceil(((event.pageX - canvas.offsetLeft)/canvas.clientWidth)*canvas.width),
            Math.ceil(((event.pageY - (canvas.offsetParent as HTMLDivElement).offsetTop)/canvas.clientHeight)*canvas.height)
        )
    }


    const onTouchMove = (event: TouchEvent<HTMLCanvasElement>) => {
        event.preventDefault()
        
        const canvas = canvasRef.current
        const touches = event.touches

        if(touches.length != 1)
            return

        const touch = touches[0]
        moveDrawing(
            Math.ceil(((touch.pageX - canvas.offsetLeft)/canvas.clientWidth)*canvas.width),
            Math.ceil(((touch.pageY - (canvas.offsetParent as HTMLDivElement).offsetTop)/canvas.clientHeight)*canvas.height)
        )
    }


    const stopDrawing = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        if(!ctx)
            return

        painting = false

        ctx.beginPath()
    }

    const onMouseUp = (event: MouseEvent<HTMLCanvasElement>) => {
        stopDrawing()
    }


    const onTouchStop = (event: TouchEvent<HTMLCanvasElement>) => {
        stopDrawing()
    }


    const updateMask : React.MouseEventHandler<HTMLButtonElement> = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        if(!ctx)
            throw Error()

        onChange(ctx.getImageData(0, 0,canvas.width, canvas.height))
    }

    const brushSizeLimits = {min: 1, max: 100}
    const brushAlphaLimits = {min: 1, max: 100}
    const canvasOpacityLimits = {min: 0, max: 100}
    
    const img = imgRef.current
    const imgCell = img.parentElement

    if(!imgCell)
        throw Error()

    
    useEffect(() => {
        // set editor width
        editorRef.current.style.width = `${img.parentElement?.clientWidth}px`

        // set canvas position, size, and opacity
        const canvas = canvasRef.current;

        canvas.style.left = `calc(${img.style.left} + 1px)`
        canvas.style.top = '1px'
        
        canvas.style.width = `${img.clientWidth}px`
        canvas.style.height = `${img.clientHeight}px`

        canvas.style.opacity = `${canvasOpacity}%`
    }, [])


    const onChangeTool = (e:React.ChangeEvent<HTMLInputElement>) => {
        setTool(e.target.value as unknown as Tool)
    }

    return (
        <div ref={editorRef} className="editor">
       
            <canvas ref={canvasRef} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onTouchStart={onTouchStart} onTouchEnd={onTouchStop} onTouchMove={onTouchMove}/>
        
            <div className="toolbar">
                <div className="toolopt">
                    <Foldable title={'Editor'} >
                        <div className='editor-opacity'>
                            <label>Opacity: <input type="range" value={canvasOpacity} min={canvasOpacityLimits.min} max={canvasOpacityLimits.max} onChange={updateCanvasOpacity}/></label>
                        </div>
                    </Foldable>
                </div>
                
                <div className="toolopt">
                    <Foldable title={'Brush'}>
                        <div className='brush-opts'>
                            <div>
                                <label>Color: <input type="color" value={brushColor} onChange={updateBrushColor}/></label>    
                                <label className='editor-settings'>Size: <input type="number" value={brushSize} min={brushSizeLimits.min} max={brushSizeLimits.max} onChange={updateBrushSize}/></label>
                        
                                <br></br>

                                <label>Alpha: <input type="range" value={brushAlpha} min={brushAlphaLimits.min} max={brushAlphaLimits.max} onChange={updateBrushAlpha}/></label>
                            </div>
                            <div onChange={onChangeTool}>
                                <div>
                                    <label><input type="radio" id="brush" name="drone" value={Tool.Brush} checked={tool === Tool.Brush} /> Brush</label>
                                </div>
                                <div>
                                    <label><input type="radio" id="eraser" name="drone" value={Tool.Eraser} checked={tool === Tool.Eraser}/> Eraser</label>
                                </div>
                            </div>
                        </div>
                    </Foldable>
                </div>

                <button onClick={updateMask}>Save</button>
            </div>
        </div>
    )
}