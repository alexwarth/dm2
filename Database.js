'use strict';

class Database {
  constructor(...facts) {
    this.factsMap = new Map();
    for (let fact of facts) {
      this.assert(fact);
    }
  }

  get facts() {
    return Array.from(this.factsMap.values());
  }

  assert(...facts) {
    for (let fact of facts) {
      fact.provenance = [];
      this.factsMap.set(JSON.stringify(fact), fact);
    }
  }

  retract(...facts) {
    for (let fact of facts) {
      this.factsMap.delete(JSON.stringify(fact));
    }
  }

  toString() {
    return this.facts.map(fact => JSON.stringify(fact)).join('\n');
  }

  match(fact, queryFact, origState) {
    if (fact.length !== queryFact.length) {
      return null;
    }
    let state = {
      vars: Object.create(origState.vars),
      facts: origState.facts.slice()
    };
    for (let idx = 0; idx < fact.length; idx++) {
      const f = fact[idx];
      const q = queryFact[idx];
      if (typeof q === 'string' && q[0] === '$') {
        if (state.vars[q] === undefined) {
          state.vars[q] = f;
        } else if (state.vars[q] !== f) {
          return null;
        }
      } else if (f !== q) {
        return null;
      }
    }
    if (!state.facts.includes(fact)) {
      state.facts.push(fact);
    }
    return state;
  }

  query(conjuncts, fn) {
    const newFactsMap = new Map();
    const retractedFacts = new Set();
    this.iQuery(
        conjuncts,
        fn,
        this.facts,
        {vars: Object.create(null), facts: []},
        fact => newFactsMap.set(JSON.stringify(fact), fact),
        fact => retractedFacts.add(fact));
    retractedFacts.forEach(fact => this.factsMap.delete(JSON.stringify(fact)));
    newFactsMap.forEach((fact, s) => this.factsMap.set(s, fact));
  }

  iQuery(conjuncts, fn, facts, state, assert, retract) {
    if (conjuncts.length === 0) {
      fn(
        state.vars,
        state.facts,
        fact => {
          fact.provenance = facts;
          assert(fact);
        },
        retract);
      return;
    }
    for (let fact of facts) {
      let newState = this.match(fact, conjuncts[0], state);
      if (newState) {
        this.iQuery(conjuncts.slice(1), fn, facts, newState, assert, retract);
      }
    }
  }
}
