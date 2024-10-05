import React, { useState } from 'react';

interface FoldableProps {
    title: string;
    children: React.ReactNode;
}

export const Foldable: React.FC<FoldableProps> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(true);

    // Toggle the fold/unfold state
    const toggle = () => setIsOpen(!isOpen);

    return (
        <div>
            {/* Button to toggle the fold/unfold state */}
            <div style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                <span onClick={toggle}>{isOpen ? '▼' : '▶'}</span> {title} 
            </div>

            {/* Conditional rendering of the content */}
            {isOpen && (
                <div style={{ marginTop: '10px', paddingLeft: '10px', borderLeft: '2px solid #ccc' }}>
                    {children}
                </div>
            )}
        </div>
    );
};


const convert = (n:number) => {
    let str:string = Number(n).toString(16);
    return str.length == 1 ? "0" + str : str;
}

export const toHex = (rgb:[number, number, number]) => {
    return "#" + convert(rgb[0]) + convert(rgb[1]) + convert(rgb[2]);
}

export const toRGBColor:(color:string)=>[number, number, number] = (color:string) => {
    const r = parseInt(color.substr(1,2), 16)
    const g = parseInt(color.substr(3,2), 16)
    const b = parseInt(color.substr(5,2), 16)

    return [r, g, b]
}