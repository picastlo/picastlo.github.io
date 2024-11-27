import React, { useRef, useState, ReactNode, useEffect, MouseEvent, TouchEvent } from 'react'
import Popup from 'reactjs-popup';

import { Transformation, Option, ValueOption, OptionVisitor, ColorOption } from '../model/Transformation'
import { Foldable, toRGBColor, toHex } from './Utils';
import { ImageEditor } from './';



interface TransformerCardInterface {
    imgRef: React.MutableRefObject<HTMLImageElement>;
    transformation: Transformation;
    onSelect: () => void;
    setDirty: () => void;
}


const cardStateInitializer:OptionVisitor<any> = {
    visitValueOption(option: ValueOption, extra: any) {
        return option.getValue()
    },

    visitColorOption(option: ColorOption, extra: any) {
        return toHex(option.getValue());
    },

    visitImageOption(option, extra) {
        return option.getValue()
    },
}


const cardUserInterfaceGenerator: OptionVisitor<JSX.Element> = {

    visitValueOption(option: ValueOption, extra:any): JSX.Element {
        const updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseInt(event.target.value)
            extra.transformation.setOption(option.name, value)
            extra.setState(value)
            extra.setDirty()
        }

        return <>
            <label>{option.name}:
                <input type="number" value={extra.state} min={option.min} max={option.max} onChange={updateValue}/>
                <input className="slider" type="range" value={extra.state} name={option.name} min={option.min} max={option.max} onChange={updateValue}/>
            </label>
            
        </>
    },

    visitColorOption(option: ColorOption, extra:any): JSX.Element {
        const updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
            extra.transformation.setOption(option.name, toRGBColor(event.target.value))
            extra.setState(event.target.value)
            extra.setDirty()
        }

        return <>
            <label>{option.name}: <input type="color" value={extra.state} onChange={updateValue}/></label>
        </>
    },

    visitImageOption(option, extra): JSX.Element {
        const updateValue = (value:ImageData) => {
            extra.transformation.setOption(option.name, value)
            extra.setState(value)
            extra.setDirty()
        }

        return <><Popup trigger={<button>Toggle Mask Editor</button>} position="right center">
                <ImageEditor imgRef={extra.imgRef} mask={extra.state} onChange={updateValue}></ImageEditor>
        </Popup></>
    },
    
}





const OptionCard = ({ imgRef, option, transformation, setDirty }: {imgRef:React.MutableRefObject<HTMLImageElement>, option: Option<any>, transformation: Transformation, setDirty: () => void }) => {

    const [value, setValue] = useState(option.accept(cardStateInitializer, null))

    return <div>
        {option.accept(cardUserInterfaceGenerator, {'imgRef':imgRef, 'transformation':transformation, 'setDirty':setDirty, 'state':value, 'setState':setValue})}
    </div>
}


const OptionsCard = ({ imgRef, transformation, setDirty }: { imgRef:React.MutableRefObject<HTMLImageElement>, transformation: Transformation, setDirty: () => void }) => {

    const [dirty2,setDirty2] = useState(false)

    const trigger = () => { setDirty(); setDirty2(false) }

    return <div onBlur={trigger}>
        {transformation.getOptions().map((o,i) => <OptionCard key={i} imgRef={imgRef} option={o} transformation={transformation} setDirty={()=>setDirty2(true)} />)}
        {transformation.getOptions().length > 0 && <button disabled={!dirty2} onClick={trigger}>Apply</button>}
    </div>
}


export const TransformerCard = ({ imgRef, transformation, onSelect, setDirty }: TransformerCardInterface) =>
    <div className="widget-card" onClick={onSelect}>
         <Foldable title={transformation.getName()}>
            <OptionsCard imgRef={imgRef} transformation={transformation} setDirty={setDirty}></OptionsCard>
        </Foldable>
    </div>


