const randomString = (num: number) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < num; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
};

const baseId = randomString(14).toString();
let seq = Math.floor(Math.random() * 10000);

export function genId(prefix: string): string {
    return `${prefix}${baseId}${++seq}`;
}
