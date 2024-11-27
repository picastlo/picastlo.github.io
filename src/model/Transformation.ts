import { PicastLoImage } from './Image';
import skmeans from "skmeans";
import Delaunator from "delaunator";

const imagejs = require('image-js');
const ImageJS = imagejs.Image


type TriangleData = { p1: number[], p2: number[], p3: number[] };


export class TransformationPipeline {

    private transformations: Transformation[]
    private input: PicastLoImage | null
    private images: PicastLoImage[]

    constructor(transformations: Transformation[]) {
        this.transformations = transformations
        this.input = null
        this.images = []
    }

    getPipeline = () => this.transformations

    length = () => this.transformations.length

    add(transformation: Transformation) {
        this.transformations.push(transformation);
    }

    insertTransformation(index: number, transformation: Transformation) {
        if (index >= 0 && index <= this.transformations.length)
            this.transformations.splice(index, 0, transformation)
    }

    removeTransformation(index: number) {
        if (index >= 0 && index <= this.transformations.length)
            this.transformations.splice(index, 1)
    }

    transform(index: number, input: PicastLoImage, callback_step: (i: number) => void): PicastLoImage {
        let output = index == 0 ? input : this.images[index - 1]

        this.images = this.images.splice(0, index)
        for (let i = index; i < this.transformations.length; i++) {
            const transform = this.transformations[i]
            output = transform.transform(output);

            this.images.push(output)
            callback_step(index)
        }
        return this.images[index]
    }

    setInitialImage(input: PicastLoImage) {
        this.input = input
    }
    
    setTransformations(pipelineString: string) {
        const pipelineObj:any = convertJsonStringToArray(pipelineString) ?? [];    
        const transformations: Transformation[] = pipelineObj.transformations.map((obj:any) => JSONtoTransformation(obj));
        this.transformations = transformations
    }

    // pre:
    performTransformations(index: number, callback_step: (i: number) => void) {
        if (this.input != null)
            this.transform(index, this.input, callback_step)
    }

    getImage(index: number) {
        if (index < 0) return this.input
        if (index < this.images.length) return this.images[index]
        else return null
    }

    getOutputImage() {
        return this.getImage(this.images.length - 1)
    }

    map = <t>(f: (value: Transformation, index: number) => t) => this.transformations.map<t>(f)

    toJSON() {
        const o = {transformations: this.transformations}
        return JSON.stringify(o)
    }

    fromJSON(data:string) {
        this.setTransformations(data)
    }
}

const convertJsonStringToArray = (jsonString: string): Transformation[] | null => {
    try {
        return JSON.parse(jsonString) as Transformation[];
    } catch (error) {
        console.error("Error parsing JSON:", error);
        throw new Error("Failed to load JSON")
    }
};


export class Renderer {
    constructor(private heightMap: PicastLoImage, private tactileMap: PicastLoImage, private resolution: number) {

    }

    setResolution(resolution: number) {
        this.resolution = resolution;
    }

    private makePointCloud(): number[][] {
        let width = this.heightMap.width();
        let height = this.heightMap.height();
        let pointCloud = [];
        for (let i = 0; i < width; i += this.resolution) {
            for (let j = 0; j < height; j += this.resolution) {
                pointCloud.push([i, j]);
            }
        }
        return pointCloud;
    }

    private triangulate(pointCloud: number[][]): TriangleData[] {
        let delaunay = Delaunator.from(pointCloud);
        let triangles = [];
        for (let i = 0; i < delaunay.triangles.length; i += 3) {
            triangles.push({ p1: pointCloud[delaunay.triangles[i]], p2: pointCloud[delaunay.triangles[i + 1]], p3: pointCloud[delaunay.triangles[i + 2]] });
        }
        return triangles;
    }

    private setHeight(point: number[]): number[] {
        let x = point[0];
        let y = point[1];
        let weight = [0.299, 0.587, 0.114];
        let height = 0;
        //todo 
        for (let i = 0; i < 3; i++) {
            if (x < this.resolution || y < this.resolution || x >= (this.heightMap.width() - this.resolution) || y >= (this.heightMap.height() - this.resolution)) {
                height = 0;
            } else {
                height += this.heightMap.getPixelXY(x, y)[i] * weight[i] + this.tactileMap.getPixelXY(x, y)[i] * weight[i];
            }
        }
        return [x, (this.heightMap.height() - y), - height / 50];
    }

    private applyHeightMap(triangles: TriangleData[]): number[][] {
        let triangles_3d: number[][] = [];
        for (let i = 0; i < triangles.length; i += 1) {
            triangles_3d.push(this.setHeight(triangles[i].p1));
            triangles_3d.push(this.setHeight(triangles[i].p2));
            triangles_3d.push(this.setHeight(triangles[i].p3));
        }
        return triangles_3d;
    }

    outputOBJTriangles(triangles: number[][]): string {
        let map = new Map();
        let obj = '';
        let counter = 1;
        for (let i = 0; i < triangles.length; i += 3) {
            let indexes = [];

            for (let j = 0; j < 3; j++) {
                let [x, y, z] = triangles[i + j];
                let vertex = `v ${x} ${y} ${-z}\n`;
                if (!map.has(vertex)) {
                    obj += vertex;
                    obj += `vn 0 0 0\n`;
                    map.set(vertex, counter);
                    indexes.push(counter);
                    counter += 1;
                } else {
                    indexes.push(map.get(vertex));
                }
            }

            let face = 'f';

            for (let j = 0; j < 3; j++) {
                face += ` ${indexes[j]}`;
            }
            obj += face + '\n';
        }


        // This makes a box around the mesh 
        let depth = 5;
        //counter 
        obj += 'v 0 0 0\n';
        //counter +1
        obj += `v ${this.heightMap.width()} 0 0\n`;
        //counter +2
        obj += `v 0 ${this.heightMap.height()} 0\n`;
        //counter +3
        obj += `v ${this.heightMap.width()} ${this.heightMap.height()} 0\n`;

        //counter +4
        obj += `v 0 0 ${-depth}\n`;
        //counter +5
        obj += `v ${this.heightMap.width()} 0 ${-depth}\n`;
        //counter +6
        obj += `v 0 ${this.heightMap.height()} ${-depth}\n`;
        //counter +7
        obj += `v ${this.heightMap.width()} ${this.heightMap.height()} ${-depth} \n`;

        function generateTriangles(a: number, b: number, c: number, d: number) {
            obj += `f ${a} ${b} ${c} ${a} \n`;
            obj += `f ${a} ${d} ${c}  ${a} \n`;
        }



        generateTriangles(counter, counter + 1, counter + 5, counter + 4);
        // obj += `f ${ counter } ${ counter + 1 } ${ counter + 5 } ${ counter + 4 } ${ counter } \n`;

        generateTriangles(counter + 2, counter + 6, counter + 7, counter + 3);
        // obj += `f ${ counter + 2 } ${ counter + 6 } ${ counter + 7 } ${ counter + 3 } ${ counter + 2 } \n`;

        generateTriangles(counter, counter + 2, counter + 6, counter + 4);
        // obj += `f ${ counter } ${ counter + 2 } ${ counter + 6 } ${ counter + 4 }  ${ counter } \n`;            

        generateTriangles(counter + 1, counter + 3, counter + 7, counter + 5);
        // obj += `f ${ counter + 1 } ${ counter + 3 } ${ counter + 7 } ${ counter + 5 } ${ counter + 1 } \n`;

        generateTriangles(counter + 4, counter + 5, counter + 7, counter + 6);
        // obj += `f ${ counter + 4 } ${ counter + 5 } ${ counter + 7 } ${ counter + 6 } ${ counter + 4 } \n`;

        return obj;
    }



    render(): string {
        let triangles = this.triangulate(this.makePointCloud());
        let triangles_3d = this.applyHeightMap(triangles);
        return this.outputOBJTriangles(triangles_3d);
    }

}

export abstract class Option<V> {

    readonly name: string

    private value: V

    constructor(name: string, value: V) {
        this.name = name
        this.value = value
    }

    setValue(value: V): void {
        if (this.validValue(value))
            this.value = value
    }

    getValue(): V {
        return this.value
    }

    abstract validValue(value: V): boolean

    abstract accept<R>(visitor: OptionVisitor<R>, extra: any): R
}

export class ValueOption extends Option<number> {

    min: number;
    max: number;

    constructor(name: string, value: number, min: number, max: number) {
        super(name, value)
        this.min = min
        this.max = max
    }

    override validValue(value: number): boolean {
        return value >= this.min && value <= this.max
    }

    override accept<R>(visitor: OptionVisitor<R>, extra: any): R {
        return visitor.visitValueOption(this, extra);
    }
}

export class ColorOption extends Option<[number, number, number]> {

    constructor(name: string, color: [number, number, number]) {
        super(name, color)
    }

    override validValue(value: [number, number, number]): boolean {
        let valid = true

        for (let i = 0; valid && i < value.length; ++i)
            valid = value[i] >= 0 && value[i] <= 255

        return valid
    }

    override accept<R>(visitor: OptionVisitor<R>, extra: any): R {
        return visitor.visitColorOption(this, extra)
    }
}


export class ImageOption extends Option<ImageData> {

    constructor(name: string, canvas: ImageData) {
        super(name, canvas)
    }

    override validValue(canvas: ImageData): boolean {
        return true
    }

    override accept<R>(visitor: OptionVisitor<R>, extra: any): R {
        return visitor.visitImageOption(this, extra)
    }
}

function JSONtoOption(obj: any): any {
    const name = obj["name"]
    const keys = Object.keys(obj);
    const secondKey = keys[1];
    const kind = obj[secondKey]

    var o = null
    if (typeof kind === 'number') {
        const value = obj["value"];
        const min = obj["min"];
        const max = obj["max"];
        o = Object.assign(new ValueOption(name, value, min, max), obj);
    } else if (Array.isArray(kind)) {
        const color = obj["color"];
        o = Object.assign(new ColorOption(name, color), obj);
    } else if (typeof kind === 'object' && kind !== null) {
        console.log("This is an object.");
    } else {
        console.log("This is of an unknown type.");
    }
    return o;
}


export interface OptionVisitor<R> {
    visitValueOption(option: ValueOption, extra: any): R

    visitColorOption(option: ColorOption, extra: any): R

    visitImageOption(option: ImageOption, extra: any): R
}



export abstract class Transformation {

    private name: string;
    private options: Option<any>[];

    constructor(name: string, opts: Option<any>[], merge: boolean) {
        this.name = name
        this.options = opts

        if (merge)
            this.options.push(new ValueOption('Opacity', 100, 0, 100))
    }

    getName(): string {
        return this.name
    }

    getOptions(): Option<any>[] {
        return this.options
    }

    protected getOption(idx: number): Option<any> {
        if (idx >= this.options.length)
            throw new Error(`index:${idx} out of bounds:${this.options.length} `)

        return this.options[idx];
    }


    setOption(name: string, value: any): void {
        if (this.options.length == 0)
            throw new Error('Cannot set options.')

        for (let i = 0; i < this.options.length; ++i) {
            if (name === this.options[i].name) {
                this.options[i].setValue(value)
                return
            }
        }
    }

    protected abstract internalTransform(input: PicastLoImage): PicastLoImage;

    transform(input: PicastLoImage): PicastLoImage {
        let transformation = this.internalTransform(input)

        if (this.options.length <= 0 || this.options[this.options.length - 1].name !== 'Opacity')
            return transformation

        let opacity_opt = <ValueOption>this.options[this.options.length - 1]

        if (opacity_opt.getValue() <= 0)
            return input

        if (opacity_opt.getValue() >= 100)
            return transformation

        let str = opacity_opt.getValue() / opacity_opt.max
        let wek = 1 - str

        for (let x = 0; x < input.width(); ++x) {
            for (let y = 0; y < input.height(); ++y) {
                let tp = transformation.getPixelXY(x, y)
                let op = input.getPixelXY(x, y)

                transformation.setPixelXY(x, y, [
                    tp[0] * str + op[0] * wek,
                    tp[1] * str + op[1] * wek,
                    tp[2] * str + op[2] * wek,
                    tp[3] * str + op[3] * wek
                ])
            }
        }

        return transformation
    }
}

// Set of transformation beased on image-js library

export abstract class ImageLibTransformation extends Transformation {

    abstract transformImage(input: any): any;

    internalTransform(input: PicastLoImage): PicastLoImage {
        const rawData: ImageData = input.copyRawData();
        const width = rawData.width;
        const height = rawData.height;
        let image = new ImageJS(width, height, rawData.data);
        image = this.transformImage(image);
        const newData = image.getRGBAData();
        for (let i = 0; i < rawData.data.length; i++) {
            rawData.data[i] = newData[i];
        }
        return new PicastLoImage(rawData);
    }

}

export class Convolution extends ImageLibTransformation {

    constructor(private kernel: number[][], name: string) {
        super(`Convolution(${name})`, [new ValueOption('Iterations', 1, 1, 25)], true);
        this.kernel = kernel
    }

    transformImage(input: any) {
        let result = input;
        for (let i = 0; i < this.getOption(0).getValue(); ++i)
            result = result.convolution(this.kernel);
        return result;
    }
}

export class GrayScale extends ImageLibTransformation {

    constructor() {
        super('Gray Scale', [], true)
    }

    transformImage(input: any) {
        return input.grey();
    }
}


function squareDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += Math.sqrt(Math.pow((a[i] - b[i]), 2));
    }
    return sum / a.length;
}

function nearest(pixel: number[], centroids: number[][]): number[] {
    let minDist = Infinity;
    let idx = 0;
    for (let i = 0; i < centroids.length; i++) {
        let dist = squareDistance(pixel, centroids[i]);
        if (i === 0 || dist < minDist) {
            minDist = dist;
            idx = i;
        }
    }
    return centroids[idx];
}

// Quantize the image using k-means algorithm
export class QuantizeImage extends Transformation {

    constructor(k: number) {
        super("Quantize", [
            new ValueOption('k', k, 1, 20),
            new ValueOption('percentage', 10, 1, 100)
        ], true)
    }

    internalTransform(input: PicastLoImage): PicastLoImage {
        const imageData: ImageData = input.copyRawData();
        const rawData = imageData.data;

        let data = [];
        //for (let i = 0; i < rawData.length; i += 4) {
        //    data.push([rawData[i], rawData[i + 1], rawData[i + 2], rawData[i + 3]]);
        //}

        let sample = Math.round(rawData.length * (this.getOption(1).getValue() / 100));
        for (let count = 0; count < sample; count++) {
            let i = Math.floor(Math.random() * (rawData.length / 4)) * 4;
            data.push([rawData[i], rawData[i + 1], rawData[i + 2], rawData[i + 3]]);
        }

        let ans = skmeans(data, this.getOption(0).getValue()); //kmeans(data, k, { tolerance: 10, maxIterations: 10 });
        let centroids = ans.centroids;

        // Assign each pixel to the nearest centroid
        for (let i = 0; i < rawData.length; i += 4) {
            let pixel = [rawData[i], rawData[i + 1], rawData[i + 2], rawData[i + 3]];
            let newPixel = nearest(pixel, centroids);
            for (let j = 0; j < 4; j++) {
                rawData[i + j] = newPixel[j];
            }
        }

        return new PicastLoImage(imageData);
    }
}


export class PointWiseTransformation extends Transformation {


    constructor(private transformation: (pixel: number[]) => number[]) {
        super('Point Wise Transformation', [], true)
    }

    internalTransform(input: PicastLoImage): PicastLoImage {
        const imageData: ImageData = input.copyRawData();
        const rawData = imageData.data;

        for (let i = 0; i < rawData.length; i += 4) {
            let pixel = [rawData[i], rawData[i + 1], rawData[i + 2], rawData[i + 3]];
            let newPixel = this.transformation(pixel);
            for (let j = 0; j < 4; j++) {
                rawData[i + j] = newPixel[j];
            }
        }

        return new PicastLoImage(imageData);
    }
}

export class SobelFilter extends ImageLibTransformation {

    constructor() {
        super('Edge Detection', [], true)
    }

    transformImage(input: any) {
        return input.sobelFilter();
    }
}


export class Invert extends ImageLibTransformation {

    constructor() {
        super('Invert Colors', [], false)
    }

    transformImage(input: any) {
        return input.invert();
    }
}

export class Blur extends ImageLibTransformation {

    constructor() {
        super('Gaussian Filter', [], true);
    }

    transformImage(input: any) {
        return input.gaussianFilter();
    }
}


function isWithinBounds(src: number, test: number, slack: number): boolean {
    return test >= src - slack && test <= src + slack

}

function isSimilar(src: number[], tst: number[], slack: number): boolean {
    // TODO use the sum of the differences / difference between component sum?
    return isWithinBounds(src[0], tst[0], slack) && isWithinBounds(src[1], tst[1], slack) && isWithinBounds(src[2], tst[2], slack)
}


export class TexturizeTransformation extends ImageLibTransformation {

    private stencil: any | null = null;

    constructor(textureFile: string, textureName: string) {
        super(`Texturize(${textureName})`, [
            new ColorOption('color', [127, 127, 127]),
            new ValueOption('margin', 0, 0, 255),
            new ValueOption('scale', 1, 1, 20),
            new ValueOption('paint strength', 50, 0, 100),
            new ValueOption('texture strength', 50, 0, 100)
        ], false);

        let pi = new PicastLoImage(null);
        pi.loadFromString(textureFile).then(tex => {
            this.stencil = new ImageJS(tex.width(), tex.height(), tex.copyRawData().data)
        })
    }

    transformImage(input: any) {
        if (!this.stencil)
            return input

        let scaled_pattern = this.stencil?.resize({ width: Math.max(1, Math.floor(this.stencil?.width * (1 / this.getOption(2).getValue()))) })
        let pattern_data = new ImageData(scaled_pattern.getRGBAData({ 'clamped': true }), scaled_pattern.width)

        const canvas = document.createElement("canvas");
        canvas.width = input.width;
        canvas.height = input.height;
        const ctx = canvas.getContext("2d");

        if (!ctx)
            throw Error()

        for (let i = 0; i < input.width; i += pattern_data.width)
            for (let j = 0; j < input.height; j += pattern_data.height)
                ctx.putImageData(pattern_data, i, j)

        let pattern = new ImageJS(input.width, input.height, ctx.getImageData(0, 0, input.width, input.height).data)

        let color = (<ColorOption>this.getOption(0)).getValue()
        let slack = (<ValueOption>this.getOption(1)).getValue()
        let colorStrOpt = <ValueOption>this.getOption(3)
        let textStrOpt = <ValueOption>this.getOption(4)

        let colorStr = colorStrOpt.getValue() / colorStrOpt.max;
        let textStr = textStrOpt.getValue() / textStrOpt.max;


        for (let x = 0; x < input.width; ++x) {
            for (let y = 0; y < input.height; ++y) {
                let orig = input.getPixelXY(x, y)
                let text = pattern.getPixelXY(x, y)

                if (!isSimilar(orig, color, slack) || orig[3] == 0)
                    continue

                input.setPixelXY(x, y, [
                    orig[0] * colorStr + text[0] * textStr,
                    orig[1] * colorStr + text[1] * textStr,
                    orig[2] * colorStr + text[2] * textStr,
                    orig[3]
                ])
            }
        }

        return input
    }
}


export class SelectTransformation extends ImageLibTransformation {

    constructor() {
        super('Select', [
            new ColorOption('Source Color', [127, 127, 127]),
            new ValueOption('Margin', 5, 0, 255),
            new ColorOption('Target Color', [127, 127, 127]),
        ], true);
    }

    transformImage(input: any) {
        let src = (<ColorOption>this.getOption(0)).getValue();
        let slack = (<ValueOption>this.getOption(1)).getValue();
        let tgt = (<ColorOption>this.getOption(2)).getValue();

        for (let x = 0; x < input.width; ++x) {
            for (let y = 0; y < input.height; ++y) {
                let pixel = input.getPixelXY(x, y)
                if (isSimilar(src, pixel, slack))
                    input.setPixelXY(x, y, tgt)
            }
        }

        return input
    }
}

let i = 0

export class PaintTransformation extends ImageLibTransformation {

    constructor(width: number, height: number) {
        super('Paint', [new ImageOption('Mask', new ImageData(width, height))], true);
    }

    transformImage(input: any) {
        let w = input.width
        let h = input.height

        let m_data = (<ImageOption>this.getOption(0)).getValue().data

        for (let x = 0; x < w; ++x) {
            for (let y = 0; y < h; ++y) {
                const m_data_ptr = (y * w + x) * 4
                const alpha = m_data[m_data_ptr + 3]

                if (alpha <= 0)
                    continue

                const m_frac = alpha / 255
                const i_frac = 1 - m_frac
                let pp = input.getPixelXY(x, y)

                let color = [
                    pp[0] * i_frac + m_data[m_data_ptr] * m_frac,
                    pp[1] * i_frac + m_data[m_data_ptr + 1] * m_frac,
                    pp[2] * i_frac + m_data[m_data_ptr + 2] * m_frac
                ]

                if (input.alpha)
                    color.push(255)

                input.setPixelXY(x, y, color)
            }
        }

        return input
    }
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


function JSONtoTransformation(obj: any): Transformation {
    const name = obj["name"]

    var o = null
    switch (name) {
        case 'Convolution(sharpen)':
            o = Object.assign(new Convolution(sharpening_kernel, "sharpen"), obj);
            break;
        case 'Convolution(smooth)':
            o = Object.assign(new Convolution(smooth_kernel, "smooth"), obj);
            break;
        case 'Gray Scale':
            o = Object.assign(new GrayScale(), obj);
            break;
        case 'Quantize':
            o = Object.assign(new QuantizeImage(5), obj);
            break;
        case 'Point Wise Transformation':
            o = Object.assign(new PointWiseTransformation((x) => {
                let [r, g, b, a] = x;
                return [r, 0, 0, a]
            }), obj);
            break;
        case 'Edge Detection':
            o = Object.assign(new SobelFilter(), obj);
            break;
        case 'Invert Colors':
            o = Object.assign(new Invert(), obj);
            break;
        case 'Gaussian Filter':
            o = Object.assign(new Blur(), obj);
            break;
        case 'Texturize(triangle)':
            o = Object.assign(new TexturizeTransformation("triangle.png", "triangle"), obj);
            break;
        case 'Texturize(waves)':
            o = Object.assign(new TexturizeTransformation("waves.png", "waves"), obj);
            break;
        case 'Texturize(circles)':
            o = Object.assign(new TexturizeTransformation("circle.png", "circles"), obj);
            break;
        case 'Texturize(spheres)':
            o = Object.assign(new TexturizeTransformation("spheres2.png", "spheres"), obj);
            break;
        case 'Select':
            o = Object.assign(new SelectTransformation(), obj);
            break;
        /*case 'Paint':
            o = Object.assign(new PaintTransformation(), obj);
            break;*/
        default:
            break;
    }

    if (o && obj["options"]) {
        o.options = obj["options"].map((option: any) => JSONtoOption(option));
    }
    return o;
}