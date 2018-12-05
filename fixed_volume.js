function check() {
    setTimeout(function () {
            let vol = parseInt(document.querySelector('#appView > div.row-big.row-top > p').textContent.split(' - ')[1]);
            let targetVol = 20;
            if (vol > targetVol) {
                console.log('vol > targetVol');
                let step = vol - targetVol;
                for (let i = 0; i < step; i++) {
                    setTimeout(function () {
                        console.log('press -');
                        document.querySelector('#appView > div:nth-child(5) > div:nth-child(1) > button:nth-child(5)').click();
                    }, 500);
                }
            }
            check()
        },
        1000);
}

check();
