var Defender = require("../src/role.defender");
var assert = require("assert");
var info = require("../src/main.info");

var Creep = require("./mock/creep-mock");
var Room = require("./mock/room-mock");
var Spawn = require("./mock/spawn-mock");

describe("role.defender", () => {
  before(() => {
    global.Game = require("./mock/game-mock").Game;
  });

  beforeEach(() => {
    Game.clearAll();
    info.clearLines();
  });

  it("constructor", () => {
    var startsWith = "class Defender";
    assert.equal(
      startsWith,
      Defender.toString().substring(0, startsWith.length),
    );

    var object = new Defender();
    assert.equal("Defender", object.roleName);
    assert.equal("#ff5555", object.color);
    assert.equal("⚔", object.symbol);
    assert.equal(20, object.priority);
  });

  describe("#findTargets", () => {
    it("should return hostile creeps from the room", () => {
      var room = new Room();
      var hostileCreep = new Creep("hostile");
      // simulate room.find for hostile creeps
      room.find = (type) => {
        if (type === FIND_HOSTILE_CREEPS) return [hostileCreep];
        return [];
      };

      var defender = new Defender();
      var targets = defender._findTargets(room);
      assert(Array.isArray(targets));
      assert.equal(1, targets.length);
      assert.equal(hostileCreep, targets[0]);
    });
  });

  describe("#work (via run)", () => {
    it("should attack target if in range", () => {
      var creep = new Creep("invader", [ATTACK, MOVE]);
      creep.memory.debug = true;

      // Create a hostile target
      var target = new Spawn(null, "target");
      target.pos.x = 5;
      target.pos.y = 5;
      // Position the creep close enough to be in range (adjacent)
      creep.pos.x = 4;
      creep.pos.y = 5;

      // Simulate that attack returns OK
      creep.attack = function (obj) {
        return OK;
      };

      var defender = new Defender();
      // Override _findTargets to return our target
      defender._findTargets = (room) => [target];
      // If in range, _moveToLocation should not be called.
      defender._moveToLocation = function (creep, obj) {
        assert.fail("Creep should not move when target is in range");
      };

      defender.run(creep);
      // If attack returns OK, nothing further should be required.
    });

    it("should move to target if not in range", () => {
      var creep = new Creep("invader", [ATTACK, MOVE]);
      creep.memory.debug = true;

      var target = new Spawn(null, "target");
      target.pos.x = 10;
      target.pos.y = 10;
      // Place the creep far away
      creep.pos.x = 1;
      creep.pos.y = 1;

      // Simulate that attack returns ERR_NOT_IN_RANGE
      var attackCalled = false;
      creep.attack = function (obj) {
        attackCalled = true;
        return ERR_NOT_IN_RANGE;
      };

      var defender = new Defender();
      defender._findTargets = (room) => [target];
      defender._moveToLocation = function (creep, obj) {
        // Simulate movement by updating the creep's position to the target's position.
        creep.pos.x = obj.pos.x;
        creep.pos.y = obj.pos.y;
      };

      defender.run(creep);
      assert.equal(true, attackCalled, "attack should have been called");
      assert.equal(target.pos.x, creep.pos.x);
      assert.equal(target.pos.y, creep.pos.y);
    });

    it("should idle if no hostile creeps found", () => {
      var creep = new Creep("invader", [ATTACK, MOVE]);
      creep.memory.debug = true;

      var defender = new Defender();
      defender._findTargets = (room) => [];

      var idleMsg = "";
      creep.say = (msg) => {
        idleMsg = msg;
      };

      defender.run(creep);
      assert.equal("🛡️ idle", idleMsg);
    });

    it("should handle unexpected attack result", () => {
      var creep = new Creep("invader", [ATTACK, MOVE]);
      creep.memory.debug = true;

      var target = new Spawn(null, "target");
      target.pos.x = 10;
      target.pos.y = 10;

      // Simulate that attack returns an unexpected error code
      creep.attack = function (obj) {
        return -999;
      };

      var defender = new Defender();
      defender._findTargets = (room) => [target];

      var errorHandled = false;
      defender._handleTargetWorkResult = function (creep, result) {
        errorHandled = true;
        assert.equal(-999, result);
      };

      defender.run(creep);
      assert.equal(true, errorHandled);
    });
  });
});
