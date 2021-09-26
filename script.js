'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// iniciating map and mapEvent variables to be used globally
let map, mapEvent;

class Workout {
  // Class fields 2021
  // Get date in which workout happened
  date = new Date();
  // id for workout
  // random generator of number ( not reccomended )
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coordes, distance, duration) {
    // // Make it work on ES6
    // this.date = new Date();
    // this.id = ...

    // [lat, long]
    this.coordes = coordes;
    // km
    this.distance = distance;
    // minutes
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    // calculate and set pace
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // Calculate and set speed
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  // private properties
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  // Constructor automatically executes the moment the object is created
  constructor() {
    this._getPosition();

    // Get data from localStorage
    this._getLocalStorage();

    // Actions upon submiting form
    // need to bind for the this to be of the class and not from the form
    form.addEventListener('submit', this._newWorkout.bind(this));
    // Toggle between these two forms on change of type
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // Get Current positin of user
  _getPosition() {
    // Get current position of the user
    // first parameter is what happens when it works
    // second parameter when it doesnt work
    if (navigator.geolocation) {
      // if it exists in user browser
      // load the position on the map, load the map if sucessful
      // Bind needed because loadMap when called in a paramater is treated as a function and not a method of the class
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your current position!');
        }
      );
    }
  }

  // Parameter is automatically added without having to put it at a paramter when calling the method
  _loadMap(position) {
    //   destructuring getti9ng the values in the object
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    // Get current location and coordinates
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    // Interactive map
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Action taken upon clicking map
    // need to bind, because if you don't the this will be from the map and not the class
    this.#map.on('click', this._showForm.bind(this));

    // render markers on map
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    // store the click informatino
    this.#mapEvent = mapE;

    // Take out hidden class from form
    form.classList.remove('hidden');
    // Focus on how many KM
    inputDistance.focus();
  }

  _hideForm() {
    // Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.getElementsByClassName.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    // get closes parent with class
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // Helper Function
    // (... inputs) means it will take n number of inputs
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    // verify if all the elements are positive
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    // The + operator returns the numeric representation of the object
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    // get lat and long of location where clicked on map
    const { lat, lng } = this.#mapEvent.latlng;
    // anything created inside a {} will stay there, so this needs to be iniciated outside of the scopes
    let workout;

    // create workout running object or cycling object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Input has to be a positive number!');
      }

      workout = new Running([lat, lng], distance, duration, cadence);

      this.#workouts.push(workout);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Input has to be a positive number!');
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);

      this.#workouts.push(workout);
    }

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // mark map
    L.marker(workout.coordes)
      .addTo(this.#map)
      // creates a pop up on top of the marker
      .bindPopup(
        // options for popup
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      // Set a text on popup
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // Renders html to be added after form of mapty website
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
<h2 class="workout__title">${workout.description}</h2>
<div class="workout__details">
  <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
  <span class="workout__value">${workout.distance}</span>
  <span class="workout__unit">km</span>
</div>
<div class="workout__details">
  <span class="workout__icon">⏱</span>
  <span class="workout__value">${workout.duration}</span>
  <span class="workout__unit">min</span>
</div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
  <span class="workout__icon">⚡️</span>
  <span class="workout__value">${workout.pace.toFixed(1)}</span>
  <span class="workout__unit">min/km</span>
</div>
<div class="workout__details">
  <span class="workout__icon">🦶🏼</span>
  <span class="workout__value">${workout.cadence}</span>
  <span class="workout__unit">spm</span>
</div>
</li>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    // If there isn't one, then return function
    if (!workoutEl) return;

    // Register workouts and their html counterpart
    const workout = this.#workouts.find(
      // if work id iguals id that is in the html found in data-id
      work => work.id === workoutEl.dataset.id
    );

    // On click on workout, scroll to the coordinates
    this.#map.setView(workout.coordes, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    // a localStorage Api that needs a key (1st paramters) and then a string to store (2nd paramter)
    // JSON.stringify converts and object to string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    // JSON.parse converts string to objects
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // set workout data to workouts
    this.#workouts = data;

    // render all of the workouts in localStorage
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  reset() {
    // remove all workouts from localStorage
    localStorage.removeItem('workouts');
    // Force refresh page
    location.reload();
  }
}

const app = new App();
