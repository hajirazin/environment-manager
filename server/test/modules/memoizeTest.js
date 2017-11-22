'use strict';

let memoize = require('../../modules/memoize');
let should = require('should');
let sinon = require('sinon');

describe('memoize', function () {
  let typeInstances = [1, 's', {}, undefined, null, false];
  context('when I try to memoize a value that is not a function', function () {
    typeInstances.forEach((instance) => {
      let type = instance === null ? 'null' : (typeof instance);
      it(`and it is a ${type} an error tells me I can only memoize a function.`, function () {
        (() => memoize(instance)).should.throw(/Can only memoize a function/);
      });
    });
  });
  context('when I memoize a function', function () {
    it('the result is a function', function () {
      memoize(() => undefined).should.be.Function();
    });
    it('the first call to the memoized function returns the same result as the un-memoized function', function () {
      let f = (x, y) => ({ x, y });
      let g = memoize(f);
      g(1, 'one').should.be.eql(f(1, 'one'));
    });
    it('the result is immutable', function () {
      let f = (x, y) => ({ x, nested: { y } });
      let g = memoize(f);
      let result = g(1, 'old');
      let mutateResult = () => { result.nested.y = 'new'; return result; };
      mutateResult.should.throw();
      result.nested.y.should.eql('old');
    });
  });
  context('when I memoize a function that returns a promise', function () {
    it('the first call to the memoized function returns the same result as the un-memoized function', function () {
      let f = x => Promise.resolve(Promise.resolve(x));
      let g = memoize(f);
      g(1, 'one').should.be.eql(f(1, 'one'));
    });
  });
  context('when I call the memoized function twice with the same arguments', function () {
    it('the un-memoized function is called once', function () {
      let f = sinon.spy(() => undefined);
      let g = memoize(f);
      g(1, 2);
      g(1, 2);
      f.calledOnce.should.be.true();
    });
    it('the second call returns the same result as the un-memoized function', function () {
      let f = (x, y) => ({ x, y });
      let g = memoize(f);
      g(1, 'one');
      g(1, 'one').should.be.eql(f(1, 'one'));
    });
    it('mutating the result of the first call does not affect the result of the second', function () {
      let f = (x, y) => ({ x, y });
      let g = memoize(f);
      let first = g(1, 'one');
      try {
        delete first.x;
      } finally {
        g(1, 'one').should.be.eql(f(1, 'one'));
      }
    });
  });
  context('when I call the memoized function twice with different arguments', function () {
    it('the un-memoized function is called twice', function () {
      let f = sinon.spy(() => undefined);
      let g = memoize(f);
      g(1, 2);
      g(2, 1);
      f.calledTwice.should.be.true();
    });
    it('the second call returns the same result as the un-memoized function', function () {
      let f = (x, y) => ({ x, y });
      let g = memoize(f);
      g(1, 'one');
      g(1, 'two').should.be.eql(f(1, 'two'));
    });
  });
});

