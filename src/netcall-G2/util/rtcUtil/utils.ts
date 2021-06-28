/* 
 * 使用尾递归优化，计算斐波那契数
 */
export function fibonacci(i:number, n1=1, n2=1):number {
    if(i <= 1) {
        return n2
    }
    return fibonacci(i - 1, n2, n1 + n2)
}

/* 
 * 获取重连时间间隔
 * 根据斐波那契数来计算，最小间隔为 2s， 最大间隔为 60s
 */
export function getReconnectionTimeout(count:number) {
    // 最小间隔2s，2,3,5,8,13,21,34,55 间隔各尝试2次
    const n = Math.round(count / 2) + 1;
    // 最大间隔 60s
    if (n > 9) {
      return 60000;
    }
    return fibonacci(n) * 1000;
}