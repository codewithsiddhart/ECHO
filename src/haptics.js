export function haptic(type) {
    if (!("vibrate" in navigator)) return;

    switch (type) {
        case "perfect":
            navigator.vibrate(30);
            break;

        case "miss":
            navigator.vibrate([20, 10, 20]);
            break;

        case "hit":
            navigator.vibrate(10);
            break;

        default:
            break;
    }
}