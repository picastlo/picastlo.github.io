import './App.css';
import React, { MouseEventHandler, ReactNode, useEffect, useRef, useState } from 'react';
import { TransformationPipeline, Transformation } from './model/Transformation' 
import { ToolBox } from './Toolbox'


const initialPipeline: TransformationPipeline = new TransformationPipeline([])

const App: React.FC = () => {

  const pipeline = initialPipeline
  const [tick, setTick] = useState(0)
  const [image, setImage] = useState<string | null>(null);
  const [selected, setSelected] = useState(pipeline.length()-1)

  const addTransform = (index:number, transform:Transformation) => {
    pipeline.insertTransformation(index, transform)
    setTick(() => tick+1) // Just because we are using objects in the pipeline that do not change
  }

  const removeTransform = (index:number) => {
    pipeline.removeTransformation(index)
    if(pipeline.length() === 0) setSelected(-1)
    else if(pipeline.length() === index ) setSelected(pipeline.length()-1)
    setTick(() => tick+1) // Just because we are using objects in the pipeline that do not change
  }


  const imgRef = useRef(null as unknown as HTMLImageElement)
  const cellRef = useRef(null as unknown as HTMLDivElement)
  const toolbarRef = useRef(null as unknown as HTMLDivElement)
  const licRef = useRef(null as unknown as HTMLDivElement)

  const imageCanvas = image && <> 
      <img ref={imgRef} src={image} alt="Uploaded" className="uploaded-image" />
    </>


  useEffect(() => {
    cellRef.current.style.width = `calc(100vw - ${toolbarRef.current.clientWidth}px)`
    licRef.current.style.width = `${toolbarRef.current.clientWidth-20}px`
  }, [])

  useEffect(() => {
    const img = imgRef.current
    if(!img)
      return
    
    img.style.left = `${(cellRef.current.clientWidth - img.clientWidth)/2}px`
  }, [tick,selected,image])
  
  return (<>
    <div className="image-transformer">
      <div className="image-container">

        <div ref={cellRef} className="image-cell">{imageCanvas}</div>

        <div ref={toolbarRef} className="toolbox">
          <h1 >PicaSTLo</h1>
          <div className='transformations'>
              <ToolBox imgRef={imgRef} pipeline={pipeline} image={image} setImage={setImage} addTransform={addTransform} removeTransform={removeTransform} selected={selected} setSelected={(n) => {setSelected(n)}}/>
              <div ref={licRef} className='license'>
                <a href='https://picastlo.github.io/'>Picastlo</a> © 2024 by <a href='https://github.com/picastlo/'>Christophe Scholliers, João Costa Seco, Eduardo Geraldo</a> is licensed under <a href='https://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1'>CC BY-SA 4.0</a>
              </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );  
};

export default App;
