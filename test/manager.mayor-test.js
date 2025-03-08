var Room = require("./mock/room-mock");

var MayorManager = require("../src/manager.mayor");
var assert = require("assert");

var info = require("../src/main.info");

// TODO: Test these methods:
// - validate()
// - validateRoads()
// - buildRoads()
// - fixProblems()
// - visualize()
// - getModeDisplayName()
// - validateBuildings()
// - fetchAvailableExtensions()

describe("manager.mayor", () => {
  before(() => {
    global.Game = require("./mock/game-mock").Game;
  });

  it("exists", () => {
    var startsWith = "class MayorManager";
    assert.equal(
      startsWith,
      MayorManager.toString().substring(0, startsWith.length),
    );
  });

  describe("#fetchMemoryOfMayor", () => {
    it("no memory", () => {
      var room = new Room();

      var result = new MayorManager(room)._fetchMemoryOfMayor();

      var expecting = {
        x: 10,
        y: 0,
        mode: MayorManager.MODE_DEFAULT,
        temp: {},
      };

      assert.deepEqual(expecting, result);
      assert.deepEqual(expecting, room.memory.mayor);
    });

    it("some memory", () => {
      var room = new Room();
      room.memory.mayor = {
        y: 10,
        mode: "warn",
      };

      var result = new MayorManager(room)._fetchMemoryOfMayor();

      var expecting = {
        x: 10,
        y: 10,
        mode: "warn",
        temp: {},
      };

      assert.deepEqual(expecting, result);
      assert.deepEqual(expecting, room.memory.mayor);
    });

    it("memory present", () => {
      var room = new Room();
      room.memory.mayor = {
        x: 1,
        y: 2,
        mode: "3",
      };

      var result = new MayorManager(room)._fetchMemoryOfMayor();

      var expecting = {
        x: 1,
        y: 2,
        mode: "3",
        temp: {},
      };

      assert.deepEqual(expecting, result);
      assert.deepEqual(expecting, room.memory.mayor);
    });
  });

  describe("#constructor", () => {
    it("initializes with room", () => {
      var room = new Room();
      var mayor = new MayorManager(room);
      assert.strictEqual(mayor._room, room);
    });
  });

  describe("#runAll", () => {
    it("calls run() for all rooms", () => {
      var room = new Room();
      var called = false;
      MayorManager.prototype.run = function () {
        called = true;
      };
      MayorManager.runAll();
      assert.strictEqual(called, true);
    });
  });

  describe("#run", () => {
    it("executes without errors", () => {
      var room = new Room();
      var mayor = new MayorManager(room);
      assert.doesNotThrow(() => mayor.run());
    });
  });

  describe("#_validate", () => {
    it("runs validation without error", () => {
      var room = new Room();
      var mayor = new MayorManager(room);
      assert.doesNotThrow(() => mayor._validate());
    });
  });
});
