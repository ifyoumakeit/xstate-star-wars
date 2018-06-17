const { Machine } = window.xstate;

const STATES = {
  idle: "idle",
  pending: "pending",
  persons: "persons",
  personDetails: "personDetails",
  rejected: "rejected",
};

const ACTIONS = {
  request: "request",
  success: "success",
  failure: "failure",
  return: "return",
  selectPerson: "selectPerson",
  fetchPersons: "fetchPersons",
};

const formatText = val => {
  return val.indexOf("http") === 0
    ? React.createElement("a", { href: val }, val)
    : val;
};

const stateWarsMachine = Machine({
  initial: STATES.idle,
  states: {
    [STATES.idle]: {
      on: {
        [ACTIONS.request]: STATES.pending,
      },
    },
    [STATES.pending]: {
      on: {
        [ACTIONS.failure]: STATES.rejected,
        [ACTIONS.success]: STATES.persons,
      },
      onEntry: ACTIONS.fetchPersons,
    },
    [STATES.persons]: {
      on: {
        [ACTIONS.failure]: STATES.rejected,
        [ACTIONS.selectPerson]: STATES.personDetails,
      },
    },
    [STATES.personDetails]: {
      on: {
        [ACTIONS.failure]: STATES.rejected,
        [ACTIONS.return]: STATES.persons,
      },
    },
    [STATES.rejected]: {
      on: {
        [ACTIONS.request]: STATES.pending,
      },
    },
  },
});

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentState: this.props.machine.initialState.value,
      persons: [],
    };
  }

  dispatch(action, data) {
    let nextState;
    try {
      nextState = this.props.machine.transition(
        this.state.currentState,
        action
      );
    } catch (err) {
      return this.dispatch(ACTIONS.failure, { err });
    }

    nextState.actions.forEach(actionKey => {
      if (this.props.actionMap[actionKey]) {
        this.props.actionMap[actionKey](action, this.dispatch.bind(this));
      }
    });

    this.setState({ currentState: nextState.value, ...data });
  }

  componentDidMount() {
    this.dispatch(ACTIONS.request);
  }

  renderPersons(persons) {
    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column" } },
      persons.map((person, i) =>
        React.createElement(
          "button",
          {
            key: person.name,
            style: { height: "60px", fontSize: "1.2rem" },
            onClick: () =>
              this.dispatch(ACTIONS.selectPerson, {
                personIndex: i,
              }),
          },
          person.name
        )
      )
    );
  }

  renderPerson(person) {
    return React.createElement(
      "dl",
      {},
      Object.keys(person).map(key => {
        const attr = person[key];
        return [
          React.createElement(
            "dt",
            {
              key,
              style: { fontWeight: "bold", fontSize: "0.75rem" },
            },
            key.replace("_", " ").toUpperCase()
          ),
          React.createElement(
            "dd",
            {
              key: attr,
              style: {
                fontSize: "1.25rem",
                margin: "0 0 1rem 0",
              },
            },
            Array.isArray(attr)
              ? attr.map(val =>
                  React.createElement("p", { key: val }, formatText(val))
                )
              : attr
                ? formatText(attr)
                : "N/A"
          ),
        ];
      }),
      React.createElement(
        "button",
        {
          onClick: () => this.dispatch(ACTIONS.return),
        },
        "Back to list"
      )
    );
  }

  render() {
    const { persons = [], personIndex, currentState, err } = this.state;

    switch (currentState) {
      case STATES.persons:
        return this.renderPersons(persons);
      case STATES.personDetails:
        return this.renderPerson(persons[personIndex]);
      case STATES.rejected:
        return React.createElement("h1", {}, err.message);
      default:
        return React.createElement("h1", {}, "Loading...");
    }
  }
}

App.defaultProps = {
  actionMap: {
    [ACTIONS.fetchPersons]: async (action, dispatch) => {
      try {
        const payload = await fetch("https://swapi.co/api/people/").then(resp =>
          resp.json()
        );
        dispatch(ACTIONS.success, { persons: payload.results });
      } catch (err) {
        dispatch(ACTIONS.failure, { err });
      }
    },
  },
};

ReactDOM.render(
  React.createElement(App, { machine: stateWarsMachine }),
  document.querySelector("#root")
);
