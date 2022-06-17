import { Filter } from '../filter';
import { createTexture } from '../../gl-utils/texture';
import { StyledFilter } from './styled-filter';
import { OldFilmStyled } from './old-film-styled';
import { SketchStyled } from './sketch-styled';
import { SoulOutStyled } from './soul-out-styled';
import { GlitchStyled } from './glitch-styled';
import { ShakeStyled } from './shake-styled';
import { FlashStyled } from './flash-styled';
import { WaveStyled } from './wave-styled';
import { DistortionStyled } from './distortion-styled';
import { WaterFlowStyled } from './water-flow-styled';
import { FireStyled } from './fire-styled';
import { HackerStyled } from './hacker-styled';
import { SnowStyled } from './snow-styled';
import { SciStyled } from './sci-styled';
import { MagnifierStyled } from './magnifier-styled';
import { FlatStyled } from './flat-styled';

const styledMap = {
    oldFilm: OldFilmStyled,
    distortion: DistortionStyled,
    sketch: SketchStyled,
    soulOut: SoulOutStyled,
    glitch: GlitchStyled,
    shake: ShakeStyled,
    flash: FlashStyled,
    wave: WaveStyled,
    waterflow: WaterFlowStyled,
    fire: FireStyled,
    hacker: HackerStyled,
    snow: SnowStyled,
    constellation: SciStyled,
    magnifier: MagnifierStyled,
    mystery: FlatStyled
};

export class StyledFilters extends Filter {
    private _curStyled: StyledFilter | null = null;

    get time() {
        return this.curStyled ? this.curStyled.time : -1;
    }
    set time(time: number) {
        if (this.curStyled) this.curStyled.time = time;
    }

    get map() {
        return this.curStyled ? this.curStyled.map : super.map;
    }
    set map(map: ReturnType<typeof createTexture>) {
        if (this._map !== map) {
            this._map = map;
            if (this.curStyled) this.curStyled.map = map;
        }
    }

    get output() {
        if (this.curStyled) {
            return this.curStyled.output;
        }
        return super.output;
    }

    updateSize() {
        this.curStyled?.updateSize();
    }

    setStyled(styled: keyof typeof styledMap | null, intensity?: number) {
        const Styled = styledMap[styled!];
        if (this.curStyled && !(this.curStyled instanceof (Styled ?? Symbol))) {
            this.curStyled.destroy(false);
            this._curStyled = null;
        }
        if (Styled && !this.curStyled) {
            this._curStyled = new Styled(
                this.renderer,
                this.map,
                this.posBuffer,
                this.uvBuffer
            ) as unknown as StyledFilter;
        }
        // 同步参数
        if (typeof intensity === 'number' && this.curStyled) {
            this.curStyled.intensity = intensity;
        }
    }

    get curStyled() {
        return this._curStyled;
    }

    render() {
        this.curStyled?.render();
    }

    destroy() {
        this.curStyled?.destroy();
    }
}
