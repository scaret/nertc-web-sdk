export class GlColor {
    private _color: [number, number, number, number] = [1, 1, 1, 1];

    constructor(color: string | [number, number, number, number?]) {
        this.convert(color);
    }

    private convert(color: string | [number, number, number, number?]) {
        if (typeof color === 'string') {
            // 匹配 rgba
            // const rgba: any = color.match(
            //     /(?<=\()(\d+),(\d+),(\d+)(,(\d+)){0,1}(?=\))/
            // );
            // if (rgba) {
            //     this.convert(rgba[0].split(','));
            //     return;
            // }
            // 匹配 16 进制颜色
            if (/^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/i.test(color)) {
                if (color.length === 4) {
                    let Ncolor = '#';
                    for (let i = 1; i < 4; i += 1) {
                        Ncolor += color
                            .slice(i, i + 1)
                            .concat(color.slice(i, i + 1));
                    }
                    color = Ncolor;
                }
                //处理六位的颜色值
                const colors = [];
                for (let i = 1; i < 7; i += 2) {
                    colors.push(parseInt('0x' + color.slice(i, i + 2)));
                }
                this.convert(colors as [number, number, number, number?]);
                return;
            }
            console.error(`color:[${color}] format is error.`);
        } else {
            this._color = color.map((col, index) =>
                index < 3
                    ? Math.min(Math.max(Number(col!), 0), 255) / 255
                    : Math.min(Math.max(Number(Number(col ?? 1)), 0), 1)
            ) as [number, number, number, number];
        }
    }

    get value() {
        return this._color;
    }
    setValue(color: string | [number, number, number, number?]) {
        this.convert(color);
    }
}
