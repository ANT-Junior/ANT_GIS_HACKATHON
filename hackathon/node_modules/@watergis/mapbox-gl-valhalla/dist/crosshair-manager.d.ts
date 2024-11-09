import { Map as MapboxMap } from 'mapbox-gl';
export default class CrosshairManager {
    private map;
    private width;
    private height;
    private svgCanvas;
    private xLine;
    private yLine;
    private color;
    constructor(map: MapboxMap | undefined);
    create(): void;
    private updateValues;
    private mapResize;
    private updateCanvas;
    private createCanvas;
    private createLine;
    destroy(): void;
}
