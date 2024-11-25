
//import { kmeans } from "ml-kmeans";

import skmeans from "skmeans";
import Delaunator from "delaunator";
import { Transformation } from './Transformation';
import { createCanvasElement } from "three";
const imagejs = require('image-js');
const ImageJS = imagejs.Image

export class PicastLoImage {
    private imageData: ImageData;

    constructor(imageData: ImageData | null) {
        if (imageData) {
            this.imageData = imageData;
        } else {
            this.imageData = new ImageData(1, 1);
        }
    }

    getImageData(): ImageData {
        return this.imageData;
    }

    loadFrom(img: HTMLImageElement) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            this.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } else {
            throw new Error('Could not get context from canvas');
        }
    }

    async loadFromString(image:string) {
        return new Promise<PicastLoImage>((resolve, reject) => {
            const img = new Image();
            img.src = image;
            img.onload = () => {
              this.loadFrom(img);
              resolve(this)
            };    
        })
    }

    transformImage(transformer: Transformation): PicastLoImage {
        return transformer.transform(this);
    }

    getPixelXY(x: number, y: number): number[] {
        const rawData = this.imageData.data;
        const i = (y * 4) * this.imageData.width + x * 4;
        return [rawData[i], rawData[i + 1], rawData[i + 2], rawData[i + 3]];
    }

    setPixelXY(x: number, y: number, color: number[]): void {
        const rawData = this.imageData.data;
        const i = (y * 4) * this.imageData.width + x * 4;
        for (let j = 0; j < this.imageData.colorSpace.length; j++) {
            rawData[i + j] = color[j];
        }
    }

    copyRawData(): ImageData {
        const ctx = createCanvasElement().getContext('2d');
        if(!ctx)
            throw Error()
        const newData = ctx.createImageData(this.imageData.width, this.imageData.height, { colorSpace: this.imageData.colorSpace });
        
        for (let i = 0; i < this.imageData.data.length; i++) {
            newData.data[i] = this.imageData.data[i];
        }
        return newData;
    }

    width(): number {
        return this.imageData.width;
    }

    height(): number {
        return this.imageData.height;
    }

    dataURL(): string {
        const canvas = document.createElement('canvas');
        canvas.width = this.imageData.width;
        canvas.height = this.imageData.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const imageData = ctx.getImageData(0, 0, this.imageData.width, this.imageData.height);
            for (let i = 0; i < this.imageData.data.length; i += 1) {
                imageData.data[i] = this.imageData.data[i];
            }
            ctx.putImageData(imageData, 0, 0);
            return canvas.toDataURL();
        } else {
            throw new Error('Could not get context from canvas');
        }
    }
}


export class ImageTransformer {

    private rawData: Uint8ClampedArray;
    public width: number;
    public height: number;

    constructor(img: HTMLImageElement) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        this.width = img.width;
        this.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            this.rawData = imageData.data;
        } else {
            throw new Error('Could not get context from canvas');
        }
    }

    squareDistance(a: number[], b: number[]): number {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.sqrt(Math.pow((a[i] - b[i]), 2));
        }
        return sum / a.length;
    }

    nearest(pixel: number[], centroids: number[][]): number[] {
        let minDist = Infinity;
        let idx = 0;
        for (let i = 0; i < centroids.length; i++) {
            let dist = this.squareDistance(pixel, centroids[i]);
            if (i === 0 || dist < minDist) {
                minDist = dist;
                idx = i;
            }
        }
        return centroids[idx];
    }

    outputOBJ(polygons: number[][][]): string {
        let obj = '';
        let counter = 0;
        for (let i = 0; i < polygons.length; i++) {
            let p = polygons[i];
            for (let j = 0; j < p.length; j++) {
                obj += `v ${p[j][0]} ${p[j][1]} 0\n`;

            }
            let face = 'f';
            for (let j = 0; j < p.length; j++) {
                face += ` ${counter + j + 1}`;
            }
            obj += face + '\n';
            counter += polygons[i].length;
        }
        return obj;
    }

    outputOBJTriangles(triangles: number[][]): String {
        let map = new Map();
        let obj = '';
        let counter = 1;
        for (let i = 0; i < triangles.length; i += 3) {
            let indexes = [];
            for (let j = 0; j < 3; j++) {
                let [x, y, z] = triangles[i + j];
                let vertex = `v ${x} ${y} ${z}\n`;
                if (!map.has(vertex)) {
                    obj += vertex;
                    //map.set(vertex, counter);
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
        return obj;
    }

    convolution(kernel: number[][]): Uint8ClampedArray {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.putImageData(new ImageData(this.rawData, this.width, this.height), 0, 0);
        }
        const image = new ImageJS(canvas);
        const convolved = image.convolution(kernel);
        return convolved.data;
    }


    // Image -> Image 
    // Heightmap 
    // Tactile map 



    // Image -> GRAYSCALE -> Heightmap -> Mesh -> OBJ
    textureSynthesis(): String {
        let pointCloud = [];
        //corner points
        pointCloud.push([0, 0]);
        pointCloud.push([0, this.height - 1]);
        pointCloud.push([this.width - 1, 0]);
        pointCloud.push([this.width - 1, this.height - 1]);
        // make a mesh

        let delta = 2;
        for (let i = 0; i < this.width; i += delta) {
            for (let j = 0; j < this.height; j += delta) {
                pointCloud.push([i, j]);
            }
        }
        // triangulate
        let delaunay = Delaunator.from(pointCloud);
        let triangles_3d: number[][] = [];

        for (let i = 0; i < delaunay.triangles.length; i += 3) {
            for (let j = 0; j < 3; j++) {
                let [x, y] = pointCloud[delaunay.triangles[i + j]];
                let height = (this.getPixelXY(x, y)[0] * 0.299 + this.getPixelXY(x, y)[1] * 0.587 + this.getPixelXY(x, y)[2] * 0.114) / 255;
                triangles_3d.push([x / 20, y / 20, height]);
            }
        }
        return this.outputOBJTriangles(triangles_3d);
    }


    floodFill(x: number, y: number, targetColor: number[], replacementColor: number[], sensitivity: number): Uint32Array {
        let stack = [[x, y]];
        let borders = [];

        function clamp(value: number, min: number, max: number): number {
            if (value > max) {
                return max;
            } else if (value < min) {
                return min;
            }
            return value;
        }


        while (stack.length > 0) {
            let [x, y] = stack.pop() as number[];

            if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
                let newx = clamp(x, 0, this.width - 1);
                let newy = clamp(y, 0, this.height - 1);
                //borders.push([newx, newy]);
                this.setPixelXY(newx, newy, [255, 0, 0, 255]);
                continue;
            }

            let pixel = this.getPixelXY(x, y);
            if (this.squareDistance(pixel, targetColor) > sensitivity) {
                if (this.squareDistance(pixel, replacementColor) > sensitivity) {
                    borders.push([x, y]);
                    this.setPixelXY(x, y, [255, 0, 0, 255]);
                }
                continue;
            }

            this.setPixelXY(x, y, replacementColor);

            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) {
                        continue;
                    }
                    stack.push([x + i, y + j]);
                }
            }
        }



        let connected = [];
        let contains = new Array(this.width).fill(0).map(() => new Array(this.height).fill(false));

        for (let i = 0; i < borders.length - 1; i++) {
            let b = borders[i];
            contains[b[0]][b[1]] = true;
            this.setPixelXY(x, y, [0, 23, 180, 255]);
        }

        let removed = 0;

        let polygon = [borders[0]];
        let polygons = [];

        while (contains.flat().includes(true)) {
            let index = contains.flat().indexOf(true);
            let x = Math.floor(index / this.height);
            let y = index % this.height;

            let todo: number[] | undefined = [x, y];

            while (todo !== undefined) {
                let [x, y]: number[] = todo;
                contains[x][y] = false;
                todo = undefined;
                loop1:
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) {
                            continue;
                        }
                        if (x + i < 0 || x + i >= this.width || y + j < 0 || y + j >= this.height) {
                            continue;
                        }
                        if (contains[x + i][y + j]) {
                            this.setPixelXY(x + i, y + j, [124, 25, 34, 255]);
                            polygon.push([x + i, y + j]);
                            todo = [x + i, y + j];
                            break loop1;
                        }
                    }
                }
            }
            if (polygon.length > 2) {
                polygons.push(polygon);
            }
            polygon = [];
        }

        //let polygon = concaveman(borders);

        //corner points
        borders.push([0, 0]);
        borders.push([0, this.height - 1]);
        borders.push([this.width - 1, 0]);
        borders.push([this.width - 1, this.height - 1]);
        // make a mesh
        let delta = 10;
        for (let i = 0; i < this.width; i += delta) {
            for (let j = 0; j < this.height; j += delta) {
                borders.push([i, j]);
            }
        }

        let delaunay = Delaunator.from(borders);
        let triangles = delaunay.triangles;


        return triangles;
    }


    quantizeImage(k: number): void {
        let data = [];
        for (let i = 0; i < this.rawData.length; i += 4) {
            data.push([this.rawData[i], this.rawData[i + 1], this.rawData[i + 2], this.rawData[i + 3]]);
        }
        let ans = skmeans(data, k); //kmeans(data, k, { tolerance: 10, maxIterations: 10 });
        let centroids = ans.centroids;
        // Assign each pixel to the nearest centroid
        for (let i = 0; i < this.rawData.length; i += 4) {
            let pixel = [this.rawData[i], this.rawData[i + 1], this.rawData[i + 2], this.rawData[i + 3]];
            let newPixel = this.nearest(pixel, centroids);
            for (let j = 0; j < 4; j++) {
                this.rawData[i + j] = newPixel[j];
            }
        }
    }

    dataURL(): string {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            for (let i = 0; i < this.rawData.length; i += 1) {
                imageData.data[i] = this.rawData[i];
            }
            ctx.putImageData(imageData, 0, 0);
            return canvas.toDataURL();
        } else {
            throw new Error('Could not get context from canvas');
        }
    }

    transformImage(transformer: (r: number, g: number, b: number, a: number) => any): void {
        for (let i = 0; i < this.rawData.length; i += 4) {
            const rgba = transformer(this.rawData[i], this.rawData[i + 1], this.rawData[i + 2], this.rawData[i + 3]);
            this.rawData[i] = rgba[0];
            this.rawData[i + 1] = rgba[1];
            this.rawData[i + 2] = rgba[2];
            this.rawData[i + 3] = rgba[3];
        }
    }

    getPixelXY(x: number, y: number): number[] {
        const i = (y * 4) * this.width + x * 4;
        return [this.rawData[i], this.rawData[i + 1], this.rawData[i + 2], this.rawData[i + 3]];
    }

    setPixelXY(x: number, y: number, rgba: number[]): void {
        const i = (y * 4) * this.width + x * 4;
        this.rawData[i] = rgba[0];
        this.rawData[i + 1] = rgba[1];
        this.rawData[i + 2] = rgba[2];
        this.rawData[i + 3] = rgba[3];
    }


}
