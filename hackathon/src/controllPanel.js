

export default class controllPanel {
    _container;
    constructor() {
        this._container = document.createElement('div');
        this._container.className = 'controllPanel_container';
        this._container.style.display = 'block';
        this.addControlls();
        document.querySelector('.maplibregl-ctrl-top-right').appendChild(this._container);
    };

    addControlls() {
        let container = document.createElement('form');
        container.className = 'controllPanel';

        let input_coor = document.createElement('input');
        input_coor.setAttribute('type', 'text');
        input_coor.setAttribute('id', 'input_coor');
        let container_coor = document.createElement('div');
        container_coor.className = 'input_container';
        let label_coor = document.createElement('label');
        label_coor.innerHTML = '<span>Координаты</span>';
        container_coor.appendChild(label_coor);
        container_coor.appendChild(input_coor);
        container.appendChild(container_coor);

        let input_range = document.createElement('input');
        input_range.setAttribute('type', 'range');
        input_range.setAttribute('min', '0');
        input_range.setAttribute('max', '120');
        input_range.setAttribute('step', '1');
        input_range.value = '10';
        input_range.setAttribute('id', 'input_range');

        let container_range = document.createElement('div');
        container_range.className = 'input_container';
        let label_range = document.createElement('label');
        label_range.innerHTML = '<span>Максимальный радиус</span>';
        container_range.appendChild(label_range);
        container_range.appendChild(input_range);
        container.appendChild(container_range);

        let input_interval = document.createElement('input');
        input_interval.setAttribute('type', 'range');
        input_interval.setAttribute('min', '0');
        input_interval.setAttribute('max', '10');
        input_interval.setAttribute('step', '1');
        input_interval.value = '10';
        input_interval.setAttribute('id', 'input_interval');

        let container_interval = document.createElement('div');
        container_interval.className = 'input_container';
        let label_interval = document.createElement('label');
        label_interval.innerHTML = '<span>Интервал шага</span>';
        container_interval.appendChild(label_interval);
        container_interval.appendChild(input_interval);

        let button = document.createElement('input');
        button.setAttribute('type', 'submit');
        button.setAttribute('id', 'submit_button');
        button.textContent = 'Выполнить';

        container.appendChild(container_interval);
        container.appendChild(button);


        let low_panel = document.createElement('div');
        low_panel.className = 'lowPanel';
        low_panel.style.display = 'none';

        let downloadBar = document.createElement('div');
        downloadBar.innerHTML = `<div class="" style="cursor: pointer; display: flex; justify-content:center;">
                                    <div class="" style="align-self: center; display:flex; cursor: pointer;">
                                        <div class="icon">
                                        <span id="download" class="material-icons circular">
                                            download
                                        </span>
                                        </div>
                                        <div class="" style="font-size:0.875rem; padding: .25rem">Cкачать</div>
                                    </div>
                                </div>`;
        low_panel.appendChild(downloadBar);

        let hr = document.createElement('hr');
        hr.style.margin = '10px 0';
        low_panel.appendChild(hr);

        let container_kilometr = document.createElement('div');
        container_kilometr.className = 'container_kilometr';
        container_kilometr.id = 'container_kilometr';
        low_panel.appendChild(container_kilometr);

        container.appendChild(low_panel);

        this._container.appendChild(container);
    };

    setListeners() {
        document.getElementById('input_range').addEventListener('input', function () {

            document.getElementById('input_interval').setAttribute('max', this.value);
            this.previousElementSibling.setAttribute('value', this.value);
            document.getElementById('input_interval').dispatchEvent(new Event('input', { bubbles: true }));
        });
        document.getElementById('input_interval').addEventListener('input', function () {
            this.previousElementSibling.setAttribute('value', this.value);
        })
        document.querySelector('form.controllPanel').addEventListener('submit', function () {
            event.preventDefault();
            document.dispatchEvent(new Event('getMaps', { bubbles: true }));
        })
    }
}