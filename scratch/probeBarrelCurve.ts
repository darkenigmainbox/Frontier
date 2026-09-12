for (const exp of [0.75, 1.0, 1.2, 1.4, 1.6]) {
  console.log('exp', exp);
  for (let t=0; t<=1; t+=0.1) {
    const r = Math.pow(Math.sin(Math.PI*(0.1+0.8*t)), exp);
    console.log('  t',t.toFixed(1), 'r/R', r.toFixed(3));
  }
}
