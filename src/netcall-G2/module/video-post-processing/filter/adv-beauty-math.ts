// 向量
export class Vector2 {
    value: [number, number] = [0, 0];
    constructor(x: number, y: number) {
        this.value = [x, y];
    }

    get x(){
        return this.value[0];
    }
    set x(x: number){
        this.value[0] = x;
    }

    get y(){
        return this.value[1];
    }
    set y(y: number){
        this.value[1] = y;
    }

    get lengthPow2(){
        return Math.pow(this.x, 2) + Math.pow(this.y, 2);
    }

    get length(){
        return Math.sqrt(this.lengthPow2);
    }

    static getVec(points: number[] | Int16Array, index: number) {
        const xIdx = index * 2;
        if (xIdx < 0) {
            throw new Error('index out range');
        }
        const yIdx = xIdx + 1;
        if (yIdx >= points.length) {
            throw new Error('index out range');
        }
        return new Vector2(points[xIdx], points[yIdx]);
    }

    static setPoint(points: number[] | Int16Array, index: number, vec: Vector2){
        const xIdx = index * 2;
        if (xIdx < 0) {
            throw new Error('index out range');
        }
        const yIdx = xIdx + 1;
        if (yIdx >= points.length) {
            throw new Error('index out range');
        }
        points[xIdx] = vec.value[0];
        points[yIdx] = vec.value[1];
    }

    static normalize(v: Vector2) {
        const M = Math.sqrt(v.value[0] * v.value[0] + v.value[1] * v.value[1]);
        return new Vector2 (v.value[0] / M, v.value[1] / M);
    }

    static add(v1: Vector2, v2: Vector2) {
        return new Vector2(
            v1.value[0] + v2.value[0],
            v1.value[1] + v2.value[1]
        );
    }

    static sub(v1: Vector2, v2: Vector2) {
        return new Vector2(
            v1.value[0] - v2.value[0],
            v1.value[1] - v2.value[1]
        );
    }

    static scale(v: Vector2, scale: number) {
        return new Vector2(v.value[0] * scale, v.value[1] * scale);
    }

    static scaleByAxis(v: Vector2, x: number, y: number){
        return new Vector2(v.x * x, v.y * y);
    }

    static disPow2(v1: Vector2, v2: Vector2){
        const val1 = v1.value;
        const val2 = v2.value;
        const x = val1[0] - val2[0];
        const y = val1[1] - val2[1];
        return x*x + y*y;
    }

    static dis(v1: Vector2, v2: Vector2){
        return Math.sqrt(Vector2.disPow2(v1, v2));
    }

    static lerp(v1: Vector2, v2: Vector2, alpha:number){
        if(!v1 || !v2){
            return v1 || v2;
        }
        const val1 = v1.value;
        const val2 = v2.value;
		return new Vector2(val1[0] + ( val2[0] - val1[0] ) * alpha, val1[1] + ( val2[1] - val1[1] ) * alpha);
    }

    static intersectPoint(v1: Vector2, v2: Vector2, v3:Vector2, v4:Vector2) {
        const p1 = v1.value;
        const p2 = v2.value;
        const p3 = v3.value;
        const p4 = v4.value;
        const c2x = p3[0] - p4[0];
        const c3x = p1[0] - p2[0];
        const c2y = p3[1]- p4[1];
        const c3y = p1[1]- p2[1];
        const d  = c3x * c2y - c3y * c2x;
      
        if (d == 0) {
            return null;
        }
      
        const u1 = p1[0] * p2[1]- p1[1]* p2[0];
        const u4 = p3[0] * p4[1]- p3[1]* p4[0];
        
        const px = (u1 * c2x - c3x * u4) / d;
        const py = (u1 * c2y - c3y * u4) / d;
    
        return new Vector2(px, py);
    }

    static center(...args:Vector2[]){
        const length = args.length;
        if(!length){
            return new Vector2(0, 0);
        }
        if(length === 1){
            return new Vector2(...args[0].value);
        }
        if(length === 2){
            return new Vector2(
                (args[0].value[0] + args[1].value[0])/2,
                (args[0].value[1] + args[1].value[1])/2,
            );
        }

        let atmp = 0;
        let xtmp = 0;
        let ytmp = 0;

        for (let i = length - 1, j = 0; j < length; i = j, j++)  
        {  
            const vi = args[i].value;
            const vj = args[j].value;
            const ai = vi[0] * vj[1] - vj[0] * vi[1];  
            atmp += ai;  
            xtmp += (vj[0]+ vi[0]) * ai;  
            ytmp += (vj[1] + vi[1]) * ai;  
        }  
        
        let x = 0;
        let y = 0;
        if (atmp != 0)  
        {  
            x = xtmp / (3 * atmp);  
            y = ytmp / (3 * atmp);  
        }
        return new Vector2(x, y);
    }

     /**
     * 计算两个向量点乘（内积，数量积）
     * @param v1 {Vector2}
     * @param v2 {Vector2}
     * @returns {number}
     */
    static dot(v1: Vector2, v2: Vector2) {
        return v1.x * v2.x + v1.y * v2.y;
    }

    /**
     * 计算两个向量的叉乘（外积，向量积）
     * @param v1 {Vector2}
     * @param v2 {Vector2}
     * @returns {number}
     */
     static cross(v1: Vector2, v2: Vector2) {
        return v1.x * v2.y - v2.x * v1.y;
    }

    /**
     * 计算两个向量的夹角(0-PI)
     * @param v1 {Vector2}
     * @param v2 {Vector2}
     * @returns {number}
     */
    static angle(v1: Vector2, v2: Vector2) {
        const v1normal = Vector2.normalize(v1);
        const v2normal = Vector2.normalize(v2);
        return Math.acos(Math.min(1.0, Math.max(-1, Vector2.dot(v1normal, v2normal))));
    }

    /**
     * 计算两个向量的夹角+-(0-PI)
     * @param v1 {Vector2}
     * @param v2 {Vector2}
     * @returns {number}
     */
    static fromToAngle(v1: Vector2, v2: Vector2) {
        const cross = Vector2.cross(v1, v2);
        if (cross < 0)
            return -Vector2.angle(v1, v2);
        else
            return Vector2.angle(v1, v2);
    }
}

export class Matrix3x3{
    private matrix: [number, number, number][];
    /**
     * 构造函数
     * @param m00-m22 {Number}
     * return Matrix3x3
     */
    constructor(
        m00: number, m01: number, m02: number, 
        m10: number, m11:number, m12: number, 
        m20:number, m21: number, m22: number
    ) {
        this.matrix = [[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]];
    }

    //----------------------------------------对外属性方法----------------------------------------

    //----------元素属性----------
    get a(){
        return this.matrix[0][0];
    }
    set a(a){
        this.matrix[0][0] = a;
    }
    get b(){
        return this.matrix[1][0];
    }
    set b(b){
        this.matrix[1][0]=b;
    }
    get c(){
        return this.matrix[0][1];
    }
    set c(c){
        this.matrix[0][1] = c;
    }
    get d(){
        return this.matrix[1][1];
    }
    set d(d){
        this.matrix[1][1] = d;
    }
    get e(){
        return this.matrix[0][2];
    }
    set e(e){
        this.matrix[0][2] = e;
    }
    get f(){
        return this.matrix[1][2];
    }
    set f(f){
        this.matrix[1][2] = f;
    }
    
    /**
     * 求当前矩阵的转置矩阵
     * return {Matrix3x3}
     */
    get transpose() {
        let m = this.matrix;
        return new Matrix3x3(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]);
    }
    
    /**
     * 利用当前矩阵变换点
     * @param point {Vector2} 需要变换的点
     * return {Vector2} 变换之后的点
     */
    multiplyPoint(point: Vector2) {
        let x = point.x;
        let y = point.y;
        let newX = x * this.matrix[0][0] + y * this.matrix[0][1] + this.matrix[0][2];
        let newY = x * this.matrix[1][0] + y * this.matrix[1][1] + this.matrix[1][2];
        let newZ = x * this.matrix[2][0] + y * this.matrix[2][1] + this.matrix[2][2];
        return new Vector2(newX / newZ, newY / newZ);
    }

    /**
     * 利用当前矩阵变换方向
     * @param vector2 {Vector2} 需要变换的方向
     * return {Vector2} 变换之后的方向
     */
    multiplyVector(v: Vector2) {
        let x = v.x;
        let y = v.y;
        let newX = x * this.matrix[0][0] + y * this.matrix[0][1];
        let newY = x * this.matrix[1][0] + y * this.matrix[1][1];
        return new Vector2(newX, newY);
    }

    //----------------------------------------静态属性方法----------------------------------------
    /**
     * 创建单位矩阵
     * return {Matrix3x3}
     */
    static identity() {
        return new Matrix3x3(1, 0, 0, 0, 1, 0, 0, 0, 1);
    }
    
    /**
     * 构建基于参照点的旋转矩阵
     * @param angle {Number} 角度
     * @param refx {Number} 参照点x
     * @param refy {Number} 参照点y
     * return {Matrix3x3}
     */
    static rotate(angle: number, refx: number, refy: number) {
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let newM = Matrix3x3.identity();
        newM.matrix[0][0] = cos;
        newM.matrix[0][1] = -sin;
        newM.matrix[1][0] = sin;
        newM.matrix[1][1] = cos;
        newM.matrix[0][2] = refx * (1 - cos) + refy * sin;
        newM.matrix[1][2] = refy * (1 - cos) - refx * sin;
        return newM;
    }
}

//-------------------------------------------------美颜函数-------------------------------------------------
export type HandleKey = 
    // 大眼
    'enlargeEye'|
    // 圆眼
    'roundedEye'|
    // 开眼角
    'openCanthus'|
    // 眼距
    'eyeDistance'|
    // 眼睛角度
    'eyeAngle'|
    // 瘦鼻
    'shrinkNose'|
    // 长鼻
    'lengthenNose'|
    // 嘴巴调整
    'shrinkMouth'|
    // 嘴角调整
    'mouthCorners'|
    // 调整人中
    'adjustPhiltrum'|
    // 瘦下颌
    'shrinkUnderjaw'|
    // 瘦颧骨
    'shrinkCheekbone'|
    // 下巴长度
    'lengthenJaw'|
     // 窄脸
     'narrowedFace'|
     // 瘦脸
     'shrinkFace'|
     // v 脸
     'vShapedFace'|
     // 小脸
     'minifyFace' |
     // 美牙
     'whitenTeeth' |
     // 亮眼
     'brightenEye';

let lEyeCenter: Vector2;
let rEyeCenter: Vector2;
let miscutRatio: number = 1;
let lmiscutRatio: number = 1;
let rmiscutRatio: number = 1;

// 预计算眼睛中心点及根据中心点据求错切系数
export const preHandle = (posData: Int16Array)=>{
    // 计算左眼几何中心
    lEyeCenter = Vector2.center(
        ...(
            [52,53,54,55,56,57,72,73].map((idx)=>{
                return Vector2.getVec(posData, idx);
            })
        )
    );
    // 计算右眼几何中心
    rEyeCenter = Vector2.center(
        ...(
            [58,59,60,61,62,63,75,76].map((idx)=>{
                return Vector2.getVec(posData, idx);
            })
        )
    );
    // 计算错切系数
    const p43 = Vector2.getVec(posData, 43);
    const lDis = Vector2.dis(lEyeCenter, p43);
    const rDis = Vector2.dis(rEyeCenter, p43);
    miscutRatio = lDis > rDis ? rDis / (lDis || 1) : lDis / (rDis || 1);
    // 扩展 30% 的阈值，兼容左右脸不对称的情况
    miscutRatio = Math.min(1.0, Math.max(0.0, miscutRatio / 0.7));
    
    const maxDis = Math.max(lDis, rDis);
    lmiscutRatio = lDis/maxDis;
    rmiscutRatio - rDis/maxDis;
}

// 大眼和圆眼最好用 shader 去对像素进行操作，这样过度会更自然一点
// 后续有时间再重构
export const handlers:{
    [key in HandleKey]?:(posData: Int16Array, intensity: number) => any
} = {
    eyeAngle:(posData, intensity)=>{
        const angle = (intensity - 0.5) * 0.06 * Math.PI;
        // 构建左旋转矩阵
        const matrixl = Matrix3x3.rotate(angle, lEyeCenter.value[0], lEyeCenter.value[1]);
        // 旋转左眼
        [52,53,54,55,56,57,72,73].forEach((idx)=>{
            const p = matrixl.multiplyPoint(Vector2.getVec(posData, idx));
            Vector2.setPoint(posData, idx, p);
        });

        // 构建右旋转矩阵
        const matrixr = Matrix3x3.rotate(-angle, rEyeCenter.value[0], rEyeCenter.value[1]);
         // 旋转右眼
        [58,59,60,61,62,63,75,76].forEach((idx)=>{
            const p = matrixr.multiplyPoint(Vector2.getVec(posData, idx));
            Vector2.setPoint(posData, idx, p);
        });
    },
    openCanthus:(posData, intensity)=>{
        const scale = 1.0 + intensity * 0.05 * miscutRatio;

        // 取出 52、55 点, 沿对应向量平移 55 点
        const p52 = Vector2.getVec(posData, 52);
        const p55 = Vector2.add(p52, Vector2.scale(Vector2.sub(Vector2.getVec(posData, 55), p52), scale));

        // 取出 61、58 点，沿对应向量平移 58 点
        const p61 = Vector2.getVec(posData, 61);
        const p58 = Vector2.add(p61, Vector2.scale(Vector2.sub(Vector2.getVec(posData, 58), p61), scale));

        // 更改 55、58 点的位置信息
        Vector2.setPoint(posData, 55, p55);
        Vector2.setPoint(posData, 58, p58);

        // 将 54、56 点靠拢 55 点；将 59、63 点靠拢 58 点
        [54, 56, 59, 63].forEach((idx)=>{
            let p = Vector2.getVec(posData, idx);
            p = Vector2.lerp(p, idx < 57 ? p55 : p58, intensity * 0.1);
            Vector2.setPoint(posData, idx, p);
        })
        // 计算左眼几何中心
        lEyeCenter = Vector2.center(
            ...(
                [52,53,54,55,56,57,72,73].map((idx)=>{
                    return Vector2.getVec(posData, idx);
                })
            )
        );
        // 计算右眼几何中心
        rEyeCenter = Vector2.center(
            ...(
                [58,59,60,61,62,63,75,76].map((idx)=>{
                    return Vector2.getVec(posData, idx);
                })
            )
        );
    },
    eyeDistance:(posData, intensity)=>{
        intensity = (intensity - 0.5) * miscutRatio * 0.3;

        // 扩大眼距时范围较小比较自然
        if(intensity > 0){
            intensity *= 0.6;
        }

        // 计算交点
        const p43 = Vector2.getVec(posData, 43);
        const p55 = Vector2.getVec(posData, 55);
        const p58 = Vector2.getVec(posData, 58);
        const pi = Vector2.intersectPoint(p43, Vector2.getVec(posData, 44), p55, p58) || p43;
        // 计算左右眼平移向量
        const dl = Vector2.scale(Vector2.sub(p55, pi), intensity);
        const dr = Vector2.scale(Vector2.sub(p58, pi), intensity);

        // 左眼平移
        [52,53,54,55,56,57,72,73].forEach((idx)=>{
            const p = Vector2.add(Vector2.getVec(posData, idx), dl);
            Vector2.setPoint(posData, idx, p);
        });

        // 右眼平移
        [58,59,60,61,62,63,75,76].forEach((idx)=>{
            const p = Vector2.add(Vector2.getVec(posData, idx), dr);
            Vector2.setPoint(posData, idx, p);
        })
        // 计算左眼几何中心
        lEyeCenter = Vector2.center(
            ...(
                [52,53,54,55,56,57,72,73].map((idx)=>{
                    return Vector2.getVec(posData, idx);
                })
            )
        );
        // 计算右眼几何中心
        rEyeCenter = Vector2.center(
            ...(
                [58,59,60,61,62,63,75,76].map((idx)=>{
                    return Vector2.getVec(posData, idx);
                })
            )
        );
    },
    roundedEye:(posData, intensity)=>{
        // // 横向缩放因子
        // const hScale = 1.0 - intensity * 0.05 * miscutRatio;
        // // 纵向缩放因子
        // const vScale = 1.0 + intensity * 0.3;
        // // 斜向缩放因子
        // const vhScale = hScale * 0.4 + vScale * 0.6;
        // // 缩放因子队列
        // const scales = [vhScale, vhScale, vhScale, vhScale, vScale, vScale];
    
        // // 左眼放大
        // [53,54,56,57,72,73].forEach((idx, index)=>{
        //     let p = Vector2.getVec(posData, idx);
        //     p = Vector2.add(lEyeCenter, Vector2.scale(Vector2.sub(p, lEyeCenter), scales[index]));
        //     Vector2.setPoint(posData, idx, p);
        // });

        // // 右眼放大
        // [59,60,62,63,75,76].forEach((idx, index)=>{
        //     let p = Vector2.getVec(posData, idx);
        //     p = Vector2.add(rEyeCenter, Vector2.scale(Vector2.sub(p, rEyeCenter), scales[index]));
        //     Vector2.setPoint(posData, idx, p);
        // });
        return {
            lEyeCenter,
            rEyeCenter
        }
    },
    enlargeEye:(posData, intensity)=>{
        // // 横向缩放因子
        // const hScale = 1.0 + intensity * 0.1 * miscutRatio;
        // // 纵向缩放因子
        // const vScale = 1.0 + intensity * 0.25;
        // // 斜向缩放因子
        // const vhScale = hScale * 0.45 + vScale * 0.55;
        // // 缩放因子队列
        // const scales = [hScale, vhScale, vhScale, hScale, vhScale, vhScale, vScale, vScale];
    
        // // 左眼放大
        // [52,53,54,55,56,57,72,73].forEach((idx, index)=>{
        //     let p = Vector2.getVec(posData, idx);
        //     p = Vector2.add(lEyeCenter, Vector2.scale(Vector2.sub(p, lEyeCenter), scales[index]));
        //     Vector2.setPoint(posData, idx, p);
        // });

        // // 右眼放大
        // [58,59,60,61,62,63,75,76].forEach((idx, index)=>{
        //     let p = Vector2.getVec(posData, idx);
        //     p = Vector2.add(rEyeCenter, Vector2.scale(Vector2.sub(p, rEyeCenter), scales[index]));
        //     Vector2.setPoint(posData, idx, p);
        // });
        return {
            lEyeCenter,
            rEyeCenter
        }
    },
    shrinkNose:(posData, intensity)=>{
        intensity = intensity * 0.15 * miscutRatio;
        // 将 80、82 点靠近 46 点， 将 81、83 点靠近 46 点
        const p46 = Vector2.getVec(posData, 46);
        [80, 81, 82, 83].forEach((idx)=>{
            Vector2.setPoint(posData, idx, Vector2.lerp(Vector2.getVec(posData, idx), p46, intensity));
        });

        // 将 47、51 点靠近 49 点
        const p49 = Vector2.getVec(posData, 49);
        [47, 51].forEach((idx)=>{
            Vector2.setPoint(posData, idx, Vector2.lerp(Vector2.getVec(posData, idx), p49, intensity));
        });
    },
    lengthenNose:(posData, intensity)=>{
        // 长鼻在理想状态下无需错切修正
        // 但是原始的推理数据存在侧面误差，因此引入错切系数对其尽心修正
        // 此处的错切系数容错范围进一步扩大，以使得仅在推理数据存在误差的阈值处进行容错
        intensity = (intensity - 0.5) * 0.5 * Math.min(1.0, Math.pow(miscutRatio, 3.0) * 4);
     
        // 标记 46 点的邻接点
        const adjs46 = [80, 81, 82, 83, 47, 51];
        const p46 = Vector2.getVec(posData, 46);

        // 记录邻接点相对位移
        const adjs46vs: Vector2[] = [];
        adjs46.forEach((idx)=>{
            adjs46vs.push(Vector2.sub(Vector2.getVec(posData, idx), p46));
        })

        // 平移 49 点
        const p49 = Vector2.getVec(posData, 49);
        const n49 = Vector2.lerp(p49, Vector2.getVec(posData, 87), intensity);
        Vector2.setPoint(posData, 49, n49);

        // 计算 49 点位移向量
        const mv = Vector2.sub(n49, p49);

        // 平移 46 点
        const n46 = Vector2.add(p46, mv);
        Vector2.setPoint(posData, 46, n46);

        // 将 46 点邻接点，保持与 46 点相对位置不变进行迁移
        adjs46vs.forEach((v, index)=>{
            const p = Vector2.add(n46, v);
            Vector2.setPoint(posData, adjs46[index], p);
        })
    },
    shrinkMouth:(posData, intensity)=>{
        // 横向缩放因子
        const hScale = 1.0 + intensity * 0.15 * miscutRatio;
        // 纵向缩放因子
        const vScale = 1.0 + intensity * 0.2;
        
        // 指定缩放因子插值系数(嘴外)
        const lerpRatio = [1, 0.7, 0.2, 0, 0.2, 0.7, 1, 0.66, 0.33, 0, 0.33, 0.66];
        // 指定缩放因子插值系数(嘴内)
        const innerLerpRatio = [1, 0.66, 0, 0.66, 1, 0.66, 0, 0.66];
        // 获取嘴外部变换点
        const mouthIdxes = [84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95];
        // 获取嘴内部变换点
        const innerMouthIdxes = [96, 97, 98, 99, 100, 101, 102, 103];

        const mouthPoints: Vector2[] = [];
        const innerMouthPoints: Vector2[] = [];
        
        mouthIdxes.forEach((idx)=>{
            mouthPoints.push(Vector2.getVec(posData, idx));
        })
        innerMouthIdxes.forEach((idx)=>{
            innerMouthPoints.push(Vector2.getVec(posData, idx));
        })

        // 求嘴部中心点
        const mouthCenter = Vector2.center(...mouthPoints);

        // 缩放嘴部关键点（外）
        mouthPoints.forEach((point, index)=>{
            const lerp = lerpRatio[index];
            const scale = hScale * lerp + vScale * (1.0 - lerp);
            Vector2.setPoint(
                posData, mouthIdxes[index], 
                Vector2.add(mouthCenter, Vector2.scale(Vector2.sub(point, mouthCenter), scale))
            );
        })
        // 缩放嘴部关键点（内）
        innerMouthPoints.forEach((point, index)=>{
            const lerp = innerLerpRatio[index];
            const scale = hScale * lerp + vScale * (1.0 - lerp);
            Vector2.setPoint(
                posData, innerMouthIdxes[index], 
                Vector2.add(mouthCenter, Vector2.scale(Vector2.sub(point, mouthCenter), scale))
            );
        })
    },
    mouthCorners:(posData, intensity)=>{
        const angle = (intensity - 0.5) * 0.06 * Math.PI;

        // 求嘴部中心点
        const mouthCenter = Vector2.center(...(
            [84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95].map(
                (idx) => Vector2.getVec(posData, idx)
            )
        ));

        // 构建左旋转矩阵
        let mat1 = Matrix3x3.rotate(angle, mouthCenter.value[0], mouthCenter.value[1]);
        let mat2 = Matrix3x3.rotate(angle*0.66, mouthCenter.value[0], mouthCenter.value[1]);
        let mat3 = Matrix3x3.rotate(angle*0.33, mouthCenter.value[0], mouthCenter.value[1]);
        let mat4 = Matrix3x3.rotate(angle*0.1, mouthCenter.value[0], mouthCenter.value[1]);
        let matSet = [mat1, mat2, mat4, mat3, mat2, mat1, mat2, mat2];
        // 旋转左嘴角
        [84, 85, 86, 94, 95, 96, 97, 103].forEach((idx, index)=>{
            const p = matSet[index].multiplyPoint(Vector2.getVec(posData, idx));
            Vector2.setPoint(posData, idx, p);
        });

        // 构建右旋转矩阵
        mat1 = Matrix3x3.rotate(-angle, mouthCenter.value[0], mouthCenter.value[1]);
        mat2 = Matrix3x3.rotate(-angle*0.66, mouthCenter.value[0], mouthCenter.value[1]);
        mat3 = Matrix3x3.rotate(-angle*0.33, mouthCenter.value[0], mouthCenter.value[1]);
        mat4 = Matrix3x3.rotate(-angle*0.1, mouthCenter.value[0], mouthCenter.value[1]);
        matSet = [mat1, mat2, mat4, mat3, mat2, mat1, mat2, mat2];
        // 旋转右嘴角
        [90, 89, 88, 92, 91, 100, 99, 101].forEach((idx, index)=>{
            const p = matSet[index].multiplyPoint(Vector2.getVec(posData, idx));
            Vector2.setPoint(posData, idx, p);
        });
    },
    adjustPhiltrum:(posData, intensity)=>{
        intensity = (intensity - 0.5) * 0.25 * Math.min(1.0, Math.pow(miscutRatio, 2) * 2);

        // 计算平移向量
        const p87 = Vector2.getVec(posData, 87);
        const moveVec = Vector2.scale(Vector2.sub(Vector2.getVec(posData, 49), p87), intensity);

        // 平移关键点
        for(let i = 84; i < 104; i++){
            Vector2.setPoint(posData, i, Vector2.add(
                Vector2.getVec(posData, i), moveVec
            ));
        }
    },
    shrinkUnderjaw:(posData, intensity)=>{
        intensity *= 0.1;
        const lIntensity = intensity * lmiscutRatio;
        const rIntensity = intensity * rmiscutRatio;

        // 获取瘦下颌关键点
        const p16 = Vector2.getVec(posData, 16);
        const p49 = Vector2.getVec(posData, 49);
        const p0 = Vector2.getVec(posData, 0);
        const p32 = Vector2.getVec(posData, 32);

        // 计算拟合点
        const idxPairs = [[8, 24], [10, 22], [12, 20]];
        const pointPairs: Vector2[][] = [];
        const lVPoints: Vector2[] = [];
        const rVPoints: Vector2[] = [];

        idxPairs.forEach((idxes)=>{
            const lp = Vector2.getVec(posData, idxes[0]);
            const rp = Vector2.getVec(posData, idxes[1]);
            pointPairs.push([lp, rp]);
            lVPoints.push(Vector2.intersectPoint(lp, p49, p0, p16)!);
            rVPoints.push(Vector2.intersectPoint(rp, p49, p32, p16)!);
        })

        // 瘦下颌拟合
        const lerpRatios = [0.5, 1.0, 0.5];
        pointPairs.forEach((points, index)=>{
            const lp = Vector2.lerp(points[0], lVPoints[index], lIntensity * lerpRatios[index]);
            const rp = Vector2.lerp(points[1], rVPoints[index], rIntensity * lerpRatios[index]);
            Vector2.setPoint(posData, idxPairs[index][0], lp);
            Vector2.setPoint(posData, idxPairs[index][1], rp);
        })
    },
    shrinkCheekbone:(posData, intensity)=>{
        intensity *= 0.4;
        const lIntensity = intensity * lmiscutRatio;
        const rIntensity = intensity * rmiscutRatio;

        // 获取瘦颧骨关键点
        const p12 = Vector2.getVec(posData, 12);
        const p20 = Vector2.getVec(posData, 20);
        const p0 = Vector2.getVec(posData, 0);
        const p32 = Vector2.getVec(posData, 32);

        // 计算拟合点
        const idxPairs = [[2, 30], [4, 28], [6, 26], [8, 24]];
        const pointPairs: Vector2[][] = [];
        const lVPoints: Vector2[] = [];
        const rVPoints: Vector2[] = [];

        idxPairs.forEach((idxes)=>{
            const lp = Vector2.getVec(posData, idxes[0]);
            const rp = Vector2.getVec(posData, idxes[1]);
            pointPairs.push([lp, rp]);
            lVPoints.push(Vector2.intersectPoint(lp, rp, p0, p12)!);
            rVPoints.push(Vector2.intersectPoint(rp, lp, p32, p20)!);
        })

        // 瘦颧骨拟合
        const lerpRatios = [1.0, 1.0, 0.5, 0.1];
        pointPairs.forEach((points, index)=>{
            const lp = Vector2.lerp(points[0], lVPoints[index], lIntensity * lerpRatios[index]);
            const rp = Vector2.lerp(points[1], rVPoints[index], rIntensity * lerpRatios[index]);
            Vector2.setPoint(posData, idxPairs[index][0], lp);
            Vector2.setPoint(posData, idxPairs[index][1], rp);
        })
    },
    lengthenJaw:(posData, intensity)=>{
        intensity = (0.5 - intensity) * 0.1 * Math.min(1.0, Math.pow(miscutRatio, 2) * 4);

        // 计算平移向量
        const p16 = Vector2.getVec(posData, 16);
        const moveVec = Vector2.sub(Vector2.getVec(posData, 49), p16);

        // 平移关键点
        const lerpRatios = [0.5, 0.5];
        [12, 20, 14, 16, 18].forEach((idx, index)=>{
            Vector2.setPoint(posData, idx, Vector2.add(
                Vector2.getVec(posData, idx), Vector2.scale(moveVec, intensity * (lerpRatios[index] || 1))
            ));
        })
    },
    narrowedFace:(posData, intensity)=>{
        intensity = intensity * 0.05;
        const lIntensity = intensity * lmiscutRatio;
        const rIntensity = intensity * rmiscutRatio;
        // 取中轴点
        const p43 = Vector2.getVec(posData, 43);
        const p16 = Vector2.getVec(posData, 16);
        // 窄脸点对
        const pairs = [[106, 111], [0,32], [2,30],[4,28],[6,26],[8,24],[10,22],[12,20],[14,18]];
        const ratios = [0.25, 0.625, 1.0];
        // 将点对与中轴的交点靠拢
        pairs.forEach((points, index)=>{
            let pl = Vector2.getVec(posData, points[0]);
            let pr = Vector2.getVec(posData, points[1]);
            let c = Vector2.intersectPoint(pl, pr, p43, p16)!
            const ratio = ratios[index] || 1.0;
            pl = Vector2.lerp(pl, c, lIntensity*ratio);
            pr = Vector2.lerp(pr, c, rIntensity*ratio);
            Vector2.setPoint(posData, points[0], pl);
            Vector2.setPoint(posData, points[1], pr);
        })
    },
    shrinkFace:(posData, intensity)=>{
        intensity = intensity * 0.1;
        const lIntensity = intensity * lmiscutRatio;
        const rIntensity = intensity * rmiscutRatio;
        // 取中轴点
        const p43 = Vector2.getVec(posData, 43);
        const p16 = Vector2.getVec(posData, 16);
        // 瘦脸点对
        let pairs = [[2,30],[4,28],[6,26],[8,24],[10,22],[12,20],[14,18]];
        // 瘦脸系数
        let ratios = [0.1, 0.325, 0.55, 0.775, 1.0, 0.9, 0.8, 0.7];
        // 将点对与中轴的交点靠拢
        pairs.forEach((points, index)=>{
            let pl = Vector2.getVec(posData, points[0]);
            let pr = Vector2.getVec(posData, points[1]);
            let c = Vector2.intersectPoint(pl, pr, p43, p16)!
            pl = Vector2.lerp(pl, c, lIntensity*ratios[index]);
            pr = Vector2.lerp(pr, c, rIntensity*ratios[index]);
            Vector2.setPoint(posData, points[0], pl);
            Vector2.setPoint(posData, points[1], pr);
        })
        // 下巴稍微上收
        const p93 = Vector2.getVec(posData, 93);
        pairs = [[14, 18], [12, 20]];
        ratios = [0.4, 0.2];
        pairs.forEach((points, index)=>{
            let pl = Vector2.getVec(posData, points[0]);
            let pr = Vector2.getVec(posData, points[1]);
            pl = Vector2.lerp(pl, p93, lIntensity*ratios[index]);
            pr = Vector2.lerp(pr, p93, rIntensity*ratios[index]);
            Vector2.setPoint(posData, points[0], pl);
            Vector2.setPoint(posData, points[1], pr);
        });
        Vector2.setPoint(
            posData,
            16,
            Vector2.lerp(Vector2.getVec(posData, 16), p93, Math.max(lIntensity, rIntensity) * 0.6)
        );
    },
    vShapedFace:(posData, intensity)=>{
        intensity -= 0.5;
        intensity = intensity > 0 ? intensity * 0.4 : intensity * 0.2;
        const lIntensity = intensity * lmiscutRatio;
        const rIntensity = intensity * rmiscutRatio;

        // 获取 V 型关键点
        const p16 = Vector2.getVec(posData, 16);
        const p2 = Vector2.getVec(posData, 2);
        const p30 = Vector2.getVec(posData, 30);
        // 计算 v 拟合点
        const idxPairs = [[4, 28], [6, 26], [8, 24], [10, 22], [12, 20], [14, 18]];
        const pointPairs: Vector2[][] = [];
        const lVPoints: Vector2[] = [];
        const rVPoints: Vector2[] = [];

        idxPairs.forEach((idxes)=>{
            const lp = Vector2.getVec(posData, idxes[0]);
            const rp = Vector2.getVec(posData, idxes[1]);
            pointPairs.push([lp, rp]);
            lVPoints.push(Vector2.intersectPoint(lp, rp, p2, p16)!);
            rVPoints.push(Vector2.intersectPoint(rp, lp, p30, p16)!);
        })

        // V 型拟合
        const lerpRatios = [0.33, 0.66];
        pointPairs.forEach((points, index)=>{
            const lp = Vector2.lerp(points[0], lVPoints[index], lIntensity * (lerpRatios[index] || 1));
            const rp = Vector2.lerp(points[1], rVPoints[index], rIntensity * (lerpRatios[index] || 1));
            Vector2.setPoint(posData, idxPairs[index][0], lp);
            Vector2.setPoint(posData, idxPairs[index][1], rp);
        })
    },
    minifyFace:(posData, intensity)=>{
        intensity = intensity * 0.1 * Math.min(1.0, Math.pow(miscutRatio, 2) * 2);

        // 计算小脸追踪点
        const p43 = Vector2.getVec(posData, 43);
        const p49 = Vector2.getVec(posData, 49);
        const p2 = Vector2.getVec(posData, 2);
        const p30 = Vector2.getVec(posData, 30);
        const tracePoint = Vector2.lerp(
            Vector2.intersectPoint(p43, p49, p2, p30)!, p43, intensity
        );

        let lerpRatios = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85];
        // 左边点位拟合
        [4, 6, 8, 10, 12, 14, 84, 85, 86, 94, 95, 96, 97, 103, 47, 80, 82].forEach((idx, index)=>{
            const p = Vector2.lerp(Vector2.getVec(posData, idx), tracePoint, intensity * (lerpRatios[index] || 0.65));
            Vector2.setPoint(posData, idx, p);
        });

        // 右边点位拟合
        [28, 26, 24, 22, 20, 18, 88, 89, 90, 91, 92, 99, 100, 101, 51, 81, 83].forEach((idx, index)=>{
            const p = Vector2.lerp(Vector2.getVec(posData, idx), tracePoint, intensity * (lerpRatios[index] || 0.65));
            Vector2.setPoint(posData, idx, p);
        });
        
        // 中间点位拟合
        lerpRatios = [1];
        [16, 93, 102, 98, 87, 49, 46].forEach((idx, index)=>{
            const p = Vector2.lerp(Vector2.getVec(posData, idx), tracePoint, intensity * (lerpRatios[index] || 0.65));
            Vector2.setPoint(posData, idx, p);
        })
    },
    whitenTeeth:(posData, intensity)=>{
        let ratio = Vector2.dis(
            Vector2.getVec(posData, 98),
            Vector2.getVec(posData, 102)
        ) / (Vector2.dis(
            Vector2.getVec(posData, 96),
            Vector2.getVec(posData, 100)
        ) || 1);
        return intensity * Math.max(0, Math.min(1.0, Math.pow(ratio * 5, 2.0)));
    }
}