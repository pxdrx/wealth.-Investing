// HSM ADR v5.0 — FXReplay
// INSTRUÇÃO: após adicionar, vá em Style e aumente a espessura das linhas SADR para 3
//@version=1

init = () => {
    indicator({ onMainPanel: true, format: 'inherit' });
    input.int('Dias', 5, 'adrDays', 1, 50);
    input.int('UTC Offset', -4, 'tzOffset', -12, 12);
    input.int('Ajuste Ancora min', 0, 'anchorAdj', -120, 120);
    input.bool('Mostrar Fib', true, 'showFib');
    input.bool('Mostrar Ancora', true, 'showAnc');
};

onTick = (length, context, _, ta, inputs) => {
    const nDays  = inputs.adrDays;
    const tzOff  = inputs.tzOffset;
    const adjMin = inputs.anchorAdj;

    // Calcular dia de um bar
    const getDay = (k) => {
        const t = time(k);
        const s = t > 1e12 ? t / 1000 : t;
        return Math.floor((s + tzOff * 3600 - adjMin * 60) / 86400);
    };

    // Processar todos os bars
    let ranges = [];
    let prevDay = -1;
    let dH = -Infinity;
    let dL = Infinity;
    let anchor = NaN;
    let adr = NaN;

    for (let k = length - 1; k >= 0; k--) {
        const day = getDay(k);
        if (day !== prevDay) {
            if (prevDay !== -1 && dH > -Infinity) ranges.push(dH - dL);
            if (ranges.length > 0) {
                const n = Math.min(nDays, ranges.length);
                let s = 0;
                for (let j = ranges.length - n; j < ranges.length; j++) s += ranges[j];
                adr = s / n;
            }
            anchor = openC(k);
            prevDay = day;
            dH = high(k);
            dL = low(k);
        } else {
            if (high(k) > dH) dH = high(k);
            if (low(k) < dL) dL = low(k);
        }
    }

    // Gap na transição de sessão
    let gap = false;
    if (length > 1) gap = (getDay(0) !== getDay(1));

    const ok = !isNaN(anchor) && !isNaN(adr) && !gap;

    // Plots — cores BRILHANTES e contrastantes
    plot.line('SADR+',  ok                    ? anchor + adr         : NaN, '#00FF00', 0);
    plot.line('SADR-',  ok                    ? anchor - adr         : NaN, '#FF0000', 0);
    plot.line('00:00',  ok && inputs.showAnc  ? anchor               : NaN, '#FFFFFF', 0);
    plot.line('33% Up', ok && inputs.showFib  ? anchor + adr * 0.333 : NaN, '#66FF66', 0);
    plot.line('33% Dn', ok && inputs.showFib  ? anchor - adr * 0.333 : NaN, '#FF6666', 0);
    plot.line('66% Up', ok && inputs.showFib  ? anchor + adr * 0.666 : NaN, '#66FF66', 0);
    plot.line('66% Dn', ok && inputs.showFib  ? anchor - adr * 0.666 : NaN, '#FF6666', 0);
};
