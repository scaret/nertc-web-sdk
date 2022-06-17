import { Filter } from '../filter';

export class StyledFilter extends Filter {
    protected _time = 0;
    protected _intensity = 0;

    get time() {
        return this._time;
    }
    set time(time: number) {
        this._time = time;
    }

    get intensity() {
        return this._intensity;
    }
    set intensity(intensity: number) {
        this._intensity = Math.min(1.0, Math.max(0.0, intensity));
    }
}
