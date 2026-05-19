# GTA Phase 1 — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player that walks, runs, punches one Aggressive NPC, the NPC dies with ragdoll, player dies and respawns at a random point — the complete combat loop.

**Architecture:** Component-Based MonoBehaviours. Pure C# classes (EventBus, States) are tested with Unity EditMode tests. MonoBehaviours are wired in the Editor. Systems communicate through EventBus — no direct cross-system references.

**Tech Stack:** Unity 2022 LTS · URP (Universal Render Pipeline) · C# · Unity Test Framework (UTF) · NavMesh · CharacterController

---

## Pre-requisites (Manual — do before starting)

1. Download and install **Unity Hub**: https://unity.com/download
2. Install **Unity 2022.3 LTS** via Unity Hub (choose "Unity 2022.3.x LTS")
3. In Unity Hub → New Project → **3D (URP)** template → name it `GTA` → save to `c:/Users/tomer/OneDrive/שולחן העבודה/GTA`
4. Unity will generate the project. Open it. Wait for import to complete.
5. In Unity: **Edit → Project Settings → Player** → set Company Name and Product Name to `GTA`

---

## File Map

All scripts go under `Assets/Scripts/`. All tests go under `Assets/Tests/EditMode/`.

| File | Responsibility |
|---|---|
| `Scripts/Core/EventBus.cs` | Static C# events — decoupled cross-system messaging |
| `Scripts/Core/InputManager.cs` | Stub input abstraction (Phase 1: keyboard only) |
| `Scripts/Core/GameManager.cs` | Game state machine (Playing / Dead / Respawning) |
| `Scripts/Core/SpawnManager.cs` | Random player respawn from list of spawn points |
| `Scripts/Combat/HealthComponent.cs` | Health, damage, death — shared by Player and NPC |
| `Scripts/Combat/WeaponComponent.cs` | Hotbar management; delegates to active WeaponBase |
| `Scripts/Weapons/WeaponBase.cs` | Abstract weapon — subclasses own Attack() + GetDamage() |
| `Scripts/Weapons/MeleeWeapon.cs` | Raycast melee hit |
| `Scripts/Player/PlayerController.cs` | Input → movement via CharacterController |
| `Scripts/Player/CameraController.cs` | Third-person follow cam + mouse look |
| `Scripts/Player/VehicleInteraction.cs` | Placeholder only in Phase 1 |
| `Scripts/NPC/INPCState.cs` | Interface for all NPC states |
| `Scripts/NPC/NPCController.cs` | NavMeshAgent brain, state runner, ragdoll trigger |
| `Scripts/NPC/AIBehaviorComponent.cs` | Behavior type enum + hit reaction dispatcher |
| `Scripts/NPC/NPCProximityDetector.cs` | Trigger sphere → notifies AIBehaviorComponent |
| `Scripts/NPC/States/IdleState.cs` | Random patrol |
| `Scripts/NPC/States/FightState.cs` | Chase + melee attack player |
| `Scripts/NPC/States/FleeState.cs` | Run away from player |
| `Scripts/NPC/States/CallHelpState.cs` | Delay + alert nearby NPCs |
| `Tests/EditMode/HealthComponentTests.cs` | TDD tests for HealthComponent |
| `Tests/EditMode/EventBusTests.cs` | TDD tests for EventBus |

---

## Task 1: Folder Structure + Test Assembly

**Files:**
- Create: `Assets/Scripts/Core/` (folder)
- Create: `Assets/Scripts/Combat/` (folder)
- Create: `Assets/Scripts/Weapons/` (folder)
- Create: `Assets/Scripts/Player/` (folder)
- Create: `Assets/Scripts/NPC/` (folder)
- Create: `Assets/Scripts/NPC/States/` (folder)
- Create: `Assets/Tests/EditMode/` (folder)

- [ ] **Step 1: Create folder structure in Unity Project window**

Right-click `Assets` → Create → Folder. Create these folders:
```
Assets/Scripts/Core
Assets/Scripts/Combat
Assets/Scripts/Weapons
Assets/Scripts/Player
Assets/Scripts/NPC
Assets/Scripts/NPC/States
Assets/Tests/EditMode
```

- [ ] **Step 2: Add Unity Test Framework package**

Window → Package Manager → search "Test Framework" → Install (version 1.3+)

- [ ] **Step 3: Create EditMode test assembly definition**

Right-click `Assets/Tests/EditMode` → Create → Testing → **Assembly Definition** → name it `GTA.Tests.EditMode`

In the Inspector for the assembly definition:
- Under **Assembly Definition References**: add `UnityEngine.TestRunner` and `UnityEditor.TestRunner`
- Under **Platforms**: check `Editor` only
- Hit Apply

- [ ] **Step 4: Create Scripts assembly definition**

Right-click `Assets/Scripts` → Create → Assembly Definition → name it `GTA.Runtime`

In the Inspector: leave defaults. Hit Apply.

In `GTA.Tests.EditMode` assembly definition: add `GTA.Runtime` to Assembly Definition References. Apply.

- [ ] **Step 5: Commit**
```bash
cd "c:/Users/tomer/OneDrive/שולחן העבודה/GTA"
git add Assets/Scripts Assets/Tests
git commit -m "chore: add folder structure and test assembly definitions"
```

---

## Task 2: EventBus

**Files:**
- Create: `Assets/Scripts/Core/EventBus.cs`
- Create: `Assets/Tests/EditMode/EventBusTests.cs`

- [ ] **Step 1: Write the failing test**

Create `Assets/Tests/EditMode/EventBusTests.cs`:
```csharp
using NUnit.Framework;
using UnityEngine;

[TestFixture]
public class EventBusTests
{
    [TearDown]
    public void TearDown()
    {
        EventBus.ClearAll();
    }

    [Test]
    public void RaisePlayerDied_CallsSubscriber()
    {
        int callCount = 0;
        EventBus.OnPlayerDied += () => callCount++;
        EventBus.RaisePlayerDied();
        Assert.AreEqual(1, callCount);
    }

    [Test]
    public void RaisePlayerDied_CalledTwice_CallsSubscriberTwice()
    {
        int callCount = 0;
        EventBus.OnPlayerDied += () => callCount++;
        EventBus.RaisePlayerDied();
        EventBus.RaisePlayerDied();
        Assert.AreEqual(2, callCount);
    }

    [Test]
    public void RaiseNPCDied_PassesCorrectGameObject()
    {
        GameObject received = null;
        GameObject expected = new GameObject("NPC");
        EventBus.OnNPCDied += go => received = go;
        EventBus.RaiseNPCDied(expected);
        Assert.AreEqual(expected, received);
        Object.DestroyImmediate(expected);
    }

    [Test]
    public void ClearAll_RemovesAllSubscribers()
    {
        int callCount = 0;
        EventBus.OnPlayerDied += () => callCount++;
        EventBus.ClearAll();
        EventBus.RaisePlayerDied();
        Assert.AreEqual(0, callCount);
    }
}
```

- [ ] **Step 2: Run test — expect FAIL**

Window → General → Test Runner → EditMode tab → Run All
Expected: All 4 tests fail with `EventBus does not exist`

- [ ] **Step 3: Implement EventBus**

Create `Assets/Scripts/Core/EventBus.cs`:
```csharp
using System;
using UnityEngine;

public static class EventBus
{
    public static event Action OnPlayerDied;
    public static event Action<Vector3> OnPlayerRespawned;
    public static event Action<GameObject> OnNPCDied;

    public static void RaisePlayerDied() => OnPlayerDied?.Invoke();
    public static void RaisePlayerRespawned(Vector3 position) => OnPlayerRespawned?.Invoke(position);
    public static void RaiseNPCDied(GameObject npc) => OnNPCDied?.Invoke(npc);

    /// <summary>Call only from tests — clears all subscribers.</summary>
    public static void ClearAll()
    {
        OnPlayerDied = null;
        OnPlayerRespawned = null;
        OnNPCDied = null;
    }
}
```

- [ ] **Step 4: Run test — expect PASS**

Window → General → Test Runner → EditMode → Run All
Expected: 4/4 PASS

- [ ] **Step 5: Commit**
```bash
git add Assets/Scripts/Core/EventBus.cs Assets/Tests/EditMode/EventBusTests.cs
git commit -m "feat: add EventBus with C# events and test coverage"
```

---

## Task 3: HealthComponent

**Files:**
- Create: `Assets/Scripts/Combat/HealthComponent.cs`
- Create: `Assets/Tests/EditMode/HealthComponentTests.cs`

- [ ] **Step 1: Write the failing tests**

Create `Assets/Tests/EditMode/HealthComponentTests.cs`:
```csharp
using NUnit.Framework;
using UnityEngine;

[TestFixture]
public class HealthComponentTests
{
    private GameObject _go;
    private HealthComponent _health;

    [SetUp]
    public void SetUp()
    {
        _go = new GameObject();
        _health = _go.AddComponent<HealthComponent>();
    }

    [TearDown]
    public void TearDown()
    {
        Object.DestroyImmediate(_go);
    }

    [Test]
    public void StartsAtMaxHealth()
    {
        Assert.AreEqual(_health.MaxHealth, _health.CurrentHealth);
    }

    [Test]
    public void TakeDamage_ReducesHealth()
    {
        _health.TakeDamage(30f);
        Assert.AreEqual(70f, _health.CurrentHealth);
    }

    [Test]
    public void TakeDamage_CannotGoBelowZero()
    {
        _health.TakeDamage(999f);
        Assert.AreEqual(0f, _health.CurrentHealth);
    }

    [Test]
    public void TakeDamage_FiresOnDied_WhenKilled()
    {
        bool died = false;
        _health.OnDied += () => died = true;
        _health.TakeDamage(999f);
        Assert.IsTrue(died);
    }

    [Test]
    public void TakeDamage_NoEffect_WhenAlreadyDead()
    {
        _health.TakeDamage(999f); // Kill
        bool firedAgain = false;
        _health.OnDied += () => firedAgain = true;
        _health.TakeDamage(50f);  // Should do nothing
        Assert.IsFalse(firedAgain);
    }

    [Test]
    public void Heal_RestoresHealth()
    {
        _health.TakeDamage(40f);
        _health.Heal(20f);
        Assert.AreEqual(80f, _health.CurrentHealth);
    }

    [Test]
    public void Heal_CannotExceedMaxHealth()
    {
        _health.Heal(999f);
        Assert.AreEqual(_health.MaxHealth, _health.CurrentHealth);
    }

    [Test]
    public void SetMaxHealth_ResetsCurrentHealth()
    {
        _health.TakeDamage(50f);
        _health.SetMaxHealth(100f);
        Assert.AreEqual(100f, _health.CurrentHealth);
    }

    [Test]
    public void IsDead_TrueWhenHealthIsZero()
    {
        _health.TakeDamage(999f);
        Assert.IsTrue(_health.IsDead);
    }

    [Test]
    public void IsDead_FalseWhenHealthAboveZero()
    {
        Assert.IsFalse(_health.IsDead);
    }

    [Test]
    public void OnHealthChanged_FiredOnDamage()
    {
        float receivedCurrent = -1f;
        _health.OnHealthChanged += (current, max) => receivedCurrent = current;
        _health.TakeDamage(25f);
        Assert.AreEqual(75f, receivedCurrent);
    }
}
```

- [ ] **Step 2: Run tests — expect FAIL**

Test Runner → EditMode → Run All
Expected: HealthComponent tests fail with `HealthComponent does not exist`

- [ ] **Step 3: Implement HealthComponent**

Create `Assets/Scripts/Combat/HealthComponent.cs`:
```csharp
using System;
using UnityEngine;

public class HealthComponent : MonoBehaviour
{
    [SerializeField] private float maxHealth = 100f;
    private float _currentHealth;

    public float CurrentHealth => _currentHealth;
    public float MaxHealth => maxHealth;
    public bool IsDead => _currentHealth <= 0f;

    public event Action<float, float> OnHealthChanged; // (current, max)
    public event Action OnDied;

    void Awake() => _currentHealth = maxHealth;

    public void TakeDamage(float amount)
    {
        if (IsDead) return;
        _currentHealth = Mathf.Max(0f, _currentHealth - amount);
        OnHealthChanged?.Invoke(_currentHealth, maxHealth);
        if (IsDead) OnDied?.Invoke();
    }

    public void Heal(float amount)
    {
        if (IsDead) return;
        _currentHealth = Mathf.Min(maxHealth, _currentHealth + amount);
        OnHealthChanged?.Invoke(_currentHealth, maxHealth);
    }

    public void SetMaxHealth(float value)
    {
        maxHealth = value;
        _currentHealth = value;
    }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Test Runner → EditMode → Run All
Expected: All HealthComponent tests PASS

- [ ] **Step 5: Commit**
```bash
git add Assets/Scripts/Combat/HealthComponent.cs Assets/Tests/EditMode/HealthComponentTests.cs
git commit -m "feat: add HealthComponent with full TDD coverage"
```

---

## Task 4: InputManager Stub

**Files:**
- Create: `Assets/Scripts/Core/InputManager.cs`

No unit tests for InputManager — it wraps Unity's Input system which requires PlayMode.

- [ ] **Step 1: Create InputManager**

Create `Assets/Scripts/Core/InputManager.cs`:
```csharp
using UnityEngine;

/// <summary>
/// Phase 1: Wraps keyboard/mouse input only.
/// Phase 4: Will be extended to support touch input for mobile.
/// PlayerController and VehicleController must NEVER call Input directly.
/// </summary>
public class InputManager : MonoBehaviour
{
    public static InputManager Instance { get; private set; }

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    /// <summary>WASD / Arrow Keys — normalized direction</summary>
    public Vector2 GetMovementInput()
        => new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));

    /// <summary>Mouse delta for camera look</summary>
    public Vector2 GetLookInput()
        => new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y"));

    /// <summary>Left mouse button / Fire1</summary>
    public bool GetAttackInput() => Input.GetButtonDown("Fire1");

    /// <summary>F key — enter/exit vehicle</summary>
    public bool GetInteractInput() => Input.GetKeyDown(KeyCode.F);

    /// <summary>Left Shift — sprint</summary>
    public bool GetSprintInput() => Input.GetKey(KeyCode.LeftShift);

    /// <summary>Returns 0-4 if a number key 1-5 was pressed, else -1</summary>
    public int GetWeaponSlotInput()
    {
        for (int i = 0; i < 5; i++)
            if (Input.GetKeyDown(KeyCode.Alpha1 + i)) return i;
        return -1;
    }
}
```

- [ ] **Step 2: Commit**
```bash
git add Assets/Scripts/Core/InputManager.cs
git commit -m "feat: add InputManager stub (keyboard only, Phase 1)"
```

---

## Task 5: GameManager + SpawnManager

**Files:**
- Create: `Assets/Scripts/Core/GameManager.cs`
- Create: `Assets/Scripts/Core/SpawnManager.cs`

- [ ] **Step 1: Create GameManager**

Create `Assets/Scripts/Core/GameManager.cs`:
```csharp
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    public enum GameState { Playing, Dead, Respawning }
    public GameState CurrentState { get; private set; } = GameState.Playing;

    [SerializeField] private float respawnDelay = 3f;
    private SpawnManager _spawnManager;

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        _spawnManager = GetComponent<SpawnManager>();
    }

    void OnEnable()  => EventBus.OnPlayerDied += HandlePlayerDied;
    void OnDisable() => EventBus.OnPlayerDied -= HandlePlayerDied;

    private void HandlePlayerDied()
    {
        if (CurrentState != GameState.Playing) return;
        CurrentState = GameState.Dead;
        Invoke(nameof(TriggerRespawn), respawnDelay);
    }

    private void TriggerRespawn()
    {
        CurrentState = GameState.Respawning;
        _spawnManager.RespawnPlayer();
        CurrentState = GameState.Playing;
    }
}
```

- [ ] **Step 2: Create SpawnManager**

Create `Assets/Scripts/Core/SpawnManager.cs`:
```csharp
using UnityEngine;

public class SpawnManager : MonoBehaviour
{
    [SerializeField] private Transform playerTransform;
    [SerializeField] private Transform[] respawnPoints;

    public void RespawnPlayer()
    {
        if (respawnPoints == null || respawnPoints.Length == 0)
        {
            Debug.LogWarning("[SpawnManager] No respawn points assigned!");
            return;
        }

        int index = Random.Range(0, respawnPoints.Length);
        Vector3 spawnPos = respawnPoints[index].position;

        // Reposition player
        var cc = playerTransform.GetComponent<CharacterController>();
        if (cc != null)
        {
            // CharacterController must be disabled to teleport
            cc.enabled = false;
            playerTransform.position = spawnPos;
            cc.enabled = true;
        }
        else
        {
            playerTransform.position = spawnPos;
        }

        // Reset health
        var health = playerTransform.GetComponent<HealthComponent>();
        health?.SetMaxHealth(health.MaxHealth);

        // Re-enable player controller (was disabled on death)
        playerTransform.GetComponent<PlayerController>()?.OnRespawned();

        EventBus.RaisePlayerRespawned(spawnPos);
    }
}
```

- [ ] **Step 3: Commit**
```bash
git add Assets/Scripts/Core/GameManager.cs Assets/Scripts/Core/SpawnManager.cs
git commit -m "feat: add GameManager (state machine) and SpawnManager (random respawn)"
```

---

## Task 6: Weapon System

**Files:**
- Create: `Assets/Scripts/Weapons/WeaponBase.cs`
- Create: `Assets/Scripts/Weapons/MeleeWeapon.cs`
- Create: `Assets/Scripts/Combat/WeaponComponent.cs`

- [ ] **Step 1: Create WeaponBase (abstract)**

Create `Assets/Scripts/Weapons/WeaponBase.cs`:
```csharp
using UnityEngine;

/// <summary>
/// Abstract weapon class. Subclasses own Attack() and GetDamage() only.
/// They know nothing about hotbars or equipping — that's WeaponComponent's job.
/// </summary>
public abstract class WeaponBase : MonoBehaviour
{
    [SerializeField] protected float damage = 25f;
    [SerializeField] protected string weaponName = "Weapon";

    public string WeaponName => weaponName;

    /// <param name="attackOrigin">The transform to raycast from (usually the player).</param>
    /// <param name="hitLayers">Which layers count as hittable targets.</param>
    public abstract void Attack(Transform attackOrigin, LayerMask hitLayers);

    public virtual float GetDamage() => damage;
}
```

- [ ] **Step 2: Create MeleeWeapon**

Create `Assets/Scripts/Weapons/MeleeWeapon.cs`:
```csharp
using UnityEngine;

public class MeleeWeapon : WeaponBase
{
    [SerializeField] private float range = 1.8f;

    public override void Attack(Transform attackOrigin, LayerMask hitLayers)
    {
        if (!Physics.Raycast(attackOrigin.position, attackOrigin.forward,
            out RaycastHit hit, range, hitLayers))
            return;

        hit.collider.GetComponent<HealthComponent>()?.TakeDamage(GetDamage());
        hit.collider.GetComponent<NPCController>()?.OnHit(attackOrigin);
    }
}
```

- [ ] **Step 3: Create WeaponComponent**

Create `Assets/Scripts/Combat/WeaponComponent.cs`:
```csharp
using UnityEngine;

/// <summary>
/// Manages the weapon hotbar and active weapon.
/// Delegates attack execution to the active WeaponBase subclass.
/// </summary>
public class WeaponComponent : MonoBehaviour
{
    [Tooltip("Slot 0 = Fists (always assigned). Slots 1-4 = other weapons.")]
    [SerializeField] private WeaponBase[] weaponSlots = new WeaponBase[5];

    [SerializeField] private LayerMask hitLayers;

    private int _activeSlot = 0;

    public WeaponBase ActiveWeapon => weaponSlots[_activeSlot];
    public int ActiveSlot => _activeSlot;

    public void EquipSlot(int slot)
    {
        if (slot < 0 || slot >= weaponSlots.Length) return;
        if (weaponSlots[slot] == null) return;
        _activeSlot = slot;
    }

    public void Attack(Transform attackOrigin)
    {
        ActiveWeapon?.Attack(attackOrigin, hitLayers);
    }
}
```

- [ ] **Step 4: Commit**
```bash
git add Assets/Scripts/Weapons/ Assets/Scripts/Combat/WeaponComponent.cs
git commit -m "feat: add WeaponBase, MeleeWeapon, and WeaponComponent (hotbar)"
```

---

## Task 7: Player Controller + Camera

**Files:**
- Create: `Assets/Scripts/Player/CameraController.cs`
- Create: `Assets/Scripts/Player/PlayerController.cs`
- Create: `Assets/Scripts/Player/VehicleInteraction.cs` (placeholder)

- [ ] **Step 1: Create CameraController**

Create `Assets/Scripts/Player/CameraController.cs`:
```csharp
using UnityEngine;

public class CameraController : MonoBehaviour
{
    [SerializeField] private Transform target;
    [SerializeField] private Vector3 offset = new Vector3(0f, 2f, -4f);
    [SerializeField] private float sensitivity = 3f;
    [SerializeField] private float pitchMin = -30f;
    [SerializeField] private float pitchMax = 60f;

    public float Yaw { get; private set; }
    private float _pitch;

    public enum CameraMode { OnFoot, InVehicle }
    private CameraMode _mode = CameraMode.OnFoot;

    void Start()
    {
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    void LateUpdate()
    {
        if (_mode == CameraMode.InVehicle) return;
        if (target == null) return;

        Vector2 look = InputManager.Instance.GetLookInput();
        Yaw   += look.x * sensitivity;
        _pitch -= look.y * sensitivity;
        _pitch  = Mathf.Clamp(_pitch, pitchMin, pitchMax);

        Quaternion rotation = Quaternion.Euler(_pitch, Yaw, 0f);
        transform.position = target.position + rotation * offset;
        transform.LookAt(target.position + Vector3.up * 1.5f);
    }

    public void SetMode(CameraMode mode) => _mode = mode;
}
```

- [ ] **Step 2: Create PlayerController**

Create `Assets/Scripts/Player/PlayerController.cs`:
```csharp
using UnityEngine;

[RequireComponent(typeof(CharacterController))]
[RequireComponent(typeof(HealthComponent))]
[RequireComponent(typeof(WeaponComponent))]
public class PlayerController : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] private float walkSpeed = 4f;
    [SerializeField] private float runSpeed  = 8f;
    [SerializeField] private float gravity   = -20f;

    private CharacterController _cc;
    private HealthComponent     _health;
    private WeaponComponent     _weapon;
    private CameraController    _camera;
    private Vector3             _velocity;

    void Awake()
    {
        _cc     = GetComponent<CharacterController>();
        _health = GetComponent<HealthComponent>();
        _weapon = GetComponent<WeaponComponent>();
        _camera = FindObjectOfType<CameraController>();
    }

    void Start() => _health.OnDied += HandleDeath;

    void Update()
    {
        HandleMovement();
        HandleAttack();
        HandleWeaponSwitch();
    }

    private void HandleMovement()
    {
        if (_cc.isGrounded && _velocity.y < 0f) _velocity.y = -2f;

        Vector2 input   = InputManager.Instance.GetMovementInput();
        bool  sprinting = InputManager.Instance.GetSprintInput();
        float speed     = sprinting ? runSpeed : walkSpeed;

        // Rotate player body to match camera yaw
        if (_camera != null)
            transform.rotation = Quaternion.Euler(0f, _camera.Yaw, 0f);

        Vector3 move = transform.right * input.x + transform.forward * input.y;
        _cc.Move(move.normalized * speed * Time.deltaTime);

        _velocity.y += gravity * Time.deltaTime;
        _cc.Move(_velocity * Time.deltaTime);
    }

    private void HandleAttack()
    {
        if (InputManager.Instance.GetAttackInput())
            _weapon.Attack(transform);
    }

    private void HandleWeaponSwitch()
    {
        int slot = InputManager.Instance.GetWeaponSlotInput();
        if (slot >= 0) _weapon.EquipSlot(slot);
    }

    private void HandleDeath()
    {
        // Disable input during death
        this.enabled = false;
        EventBus.RaisePlayerDied();
    }

    /// <summary>Called by SpawnManager after respawn — re-enables control.</summary>
    public void OnRespawned()
    {
        this.enabled = true;
    }
}
```

- [ ] **Step 3: Create VehicleInteraction placeholder**

Create `Assets/Scripts/Player/VehicleInteraction.cs`:
```csharp
using UnityEngine;

/// <summary>
/// Placeholder — implemented in Phase 3.
/// Will handle enter/exit vehicle and notify CameraController.
/// </summary>
public class VehicleInteraction : MonoBehaviour
{
    // Phase 3 implementation
}
```

- [ ] **Step 4: Commit**
```bash
git add Assets/Scripts/Player/
git commit -m "feat: add PlayerController, CameraController, VehicleInteraction placeholder"
```

---

## Task 8: NPC State Machine

**Files:**
- Create: `Assets/Scripts/NPC/INPCState.cs`
- Create: `Assets/Scripts/NPC/States/IdleState.cs`
- Create: `Assets/Scripts/NPC/States/FightState.cs`
- Create: `Assets/Scripts/NPC/States/FleeState.cs`
- Create: `Assets/Scripts/NPC/States/CallHelpState.cs`

- [ ] **Step 1: Create INPCState interface**

Create `Assets/Scripts/NPC/INPCState.cs`:
```csharp
/// <summary>
/// All NPC states implement this. NPCController calls Update() every frame.
/// States transition by calling npc.ChangeState(new SomeState()).
/// </summary>
public interface INPCState
{
    void Enter(NPCController npc);
    void Update(NPCController npc);
    void Exit(NPCController npc);
}
```

- [ ] **Step 2: Create IdleState**

Create `Assets/Scripts/NPC/States/IdleState.cs`:
```csharp
using UnityEngine;

public class IdleState : INPCState
{
    public void Enter(NPCController npc)
    {
        npc.Agent.isStopped = false;
        npc.Agent.speed     = npc.WalkSpeed;
        SetNewPatrolDestination(npc);
    }

    public void Update(NPCController npc)
    {
        if (!npc.Agent.pathPending && npc.Agent.remainingDistance < 0.5f)
            SetNewPatrolDestination(npc);
    }

    public void Exit(NPCController npc) { }

    private void SetNewPatrolDestination(NPCController npc)
    {
        Vector3 point = npc.transform.position + Random.insideUnitSphere * 6f;
        point.y = npc.transform.position.y;
        npc.Agent.SetDestination(point);
    }
}
```

- [ ] **Step 3: Create FightState**

Create `Assets/Scripts/NPC/States/FightState.cs`:
```csharp
using UnityEngine;

public class FightState : INPCState
{
    private float _attackTimer;
    private const float AttackCooldown = 1.5f;

    public void Enter(NPCController npc)
    {
        npc.Agent.isStopped = false;
        npc.Agent.speed     = npc.RunSpeed;
    }

    public void Update(NPCController npc)
    {
        if (npc.Target == null) { npc.ChangeState(new IdleState()); return; }

        npc.Agent.SetDestination(npc.Target.position);
        _attackTimer -= Time.deltaTime;

        float dist = Vector3.Distance(npc.transform.position, npc.Target.position);
        if (dist <= npc.MeleeRange && _attackTimer <= 0f)
        {
            npc.Target.GetComponent<HealthComponent>()?.TakeDamage(npc.MeleeDamage);
            _attackTimer = AttackCooldown;
        }
    }

    public void Exit(NPCController npc) { }
}
```

- [ ] **Step 4: Create FleeState**

Create `Assets/Scripts/NPC/States/FleeState.cs`:
```csharp
using UnityEngine;

public class FleeState : INPCState
{
    public void Enter(NPCController npc)
    {
        npc.Agent.isStopped = false;
        npc.Agent.speed     = npc.RunSpeed;
    }

    public void Update(NPCController npc)
    {
        if (npc.Target == null) { npc.ChangeState(new IdleState()); return; }

        Vector3 fleeDir    = (npc.transform.position - npc.Target.position).normalized;
        Vector3 fleeTarget = npc.transform.position + fleeDir * 12f;
        npc.Agent.SetDestination(fleeTarget);
    }

    public void Exit(NPCController npc) { }
}
```

- [ ] **Step 5: Create CallHelpState**

Create `Assets/Scripts/NPC/States/CallHelpState.cs`:
```csharp
using System.Collections;
using UnityEngine;

public class CallHelpState : INPCState
{
    private const float HelpRadius     = 15f;
    private const int   MaxHelpers     = 3;

    public void Enter(NPCController npc)
    {
        npc.Agent.isStopped = true;
        npc.StartCoroutine(CallForHelp(npc));
    }

    private IEnumerator CallForHelp(NPCController npc)
    {
        yield return new WaitForSeconds(Random.Range(2f, 4f));

        Collider[] hits = Physics.OverlapSphere(npc.transform.position, HelpRadius);
        int found = 0;
        foreach (var col in hits)
        {
            if (found >= MaxHelpers) break;
            var other = col.GetComponent<NPCController>();
            if (other != null && other != npc && !other.IsDead)
            {
                other.RespondToCall(npc.Target);
                found++;
            }
        }

        // After calling, this NPC runs away
        npc.ChangeState(new FleeState());
    }

    public void Update(NPCController npc) { }
    public void Exit(NPCController npc)   { }
}
```

- [ ] **Step 6: Commit**
```bash
git add Assets/Scripts/NPC/INPCState.cs Assets/Scripts/NPC/States/
git commit -m "feat: add NPC state machine (Idle, Fight, Flee, CallHelp)"
```

---

## Task 9: NPCController + AIBehaviorComponent + NPCProximityDetector

**Files:**
- Create: `Assets/Scripts/NPC/NPCController.cs`
- Create: `Assets/Scripts/NPC/AIBehaviorComponent.cs`
- Create: `Assets/Scripts/NPC/NPCProximityDetector.cs`

- [ ] **Step 1: Create AIBehaviorComponent**

Create `Assets/Scripts/NPC/AIBehaviorComponent.cs`:
```csharp
using UnityEngine;

public enum NPCBehaviorType { Passive, Aggressive, Fearful, Social }

/// <summary>
/// Determines HOW an NPC reacts. Transitions the state machine based on behavior type.
/// Does not own the state machine itself — that's NPCController's job.
/// </summary>
public class AIBehaviorComponent : MonoBehaviour
{
    [SerializeField] private NPCBehaviorType behaviorType = NPCBehaviorType.Passive;
    public NPCBehaviorType BehaviorType => behaviorType;

    public void ReactToHit(NPCController npc)
    {
        switch (behaviorType)
        {
            case NPCBehaviorType.Aggressive:
                npc.ChangeState(new FightState());
                break;
            case NPCBehaviorType.Fearful:
                npc.ChangeState(new FleeState());
                break;
            case NPCBehaviorType.Social:
                npc.ChangeState(new CallHelpState());
                break;
            case NPCBehaviorType.Passive:
                // No state change on hit — just absorbs damage
                break;
        }
    }

    public void OnPlayerNearby(Transform player)
    {
        var npc = GetComponent<NPCController>();
        if (npc == null || npc.IsDead) return;
        // Aggressive NPCs become aware but only fight when actually hit
        if (behaviorType == NPCBehaviorType.Aggressive && npc.Target == null)
            npc.Target = player;
    }
}
```

- [ ] **Step 2: Create NPCProximityDetector**

Create `Assets/Scripts/NPC/NPCProximityDetector.cs`:
```csharp
using UnityEngine;

/// <summary>
/// A trigger sphere on the NPC that notifies AIBehaviorComponent
/// when the player enters detection range.
/// Attach to a child GameObject of the NPC, NOT the root.
/// </summary>
[RequireComponent(typeof(SphereCollider))]
public class NPCProximityDetector : MonoBehaviour
{
    [SerializeField] private float detectionRadius = 6f;
    private AIBehaviorComponent _behavior;

    void Awake()
    {
        _behavior = GetComponentInParent<AIBehaviorComponent>();
        var col    = GetComponent<SphereCollider>();
        col.isTrigger = true;
        col.radius    = detectionRadius;
    }

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
            _behavior?.OnPlayerNearby(other.transform);
    }
}
```

- [ ] **Step 3: Create NPCController**

Create `Assets/Scripts/NPC/NPCController.cs`:
```csharp
using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
[RequireComponent(typeof(HealthComponent))]
[RequireComponent(typeof(AIBehaviorComponent))]
public class NPCController : MonoBehaviour
{
    [Header("Movement")]
    public float WalkSpeed  = 2f;
    public float RunSpeed   = 5f;

    [Header("Combat")]
    public float MeleeRange  = 1.5f;
    public float MeleeDamage = 20f;

    public NavMeshAgent Agent  { get; private set; }
    public Transform    Target { get; set; }
    public bool         IsDead { get; private set; }

    private INPCState           _currentState;
    private HealthComponent     _health;
    private AIBehaviorComponent _behavior;
    private Animator            _animator;
    private Rigidbody[]         _ragdollBodies;
    private Collider[]          _ragdollColliders;

    void Awake()
    {
        Agent    = GetComponent<NavMeshAgent>();
        _health  = GetComponent<HealthComponent>();
        _behavior = GetComponent<AIBehaviorComponent>();
        _animator = GetComponent<Animator>();

        // Cache all bone Rigidbodies/Colliders set up by Ragdoll Wizard
        _ragdollBodies    = GetComponentsInChildren<Rigidbody>();
        _ragdollColliders = GetComponentsInChildren<Collider>();

        DisableRagdoll();
    }

    void Start()
    {
        _health.OnDied += HandleDeath;
        ChangeState(new IdleState());
    }

    void Update()
    {
        if (!IsDead) _currentState?.Update(this);
    }

    public void ChangeState(INPCState newState)
    {
        _currentState?.Exit(this);
        _currentState = newState;
        _currentState.Enter(this);
    }

    /// <summary>Called when player hits this NPC.</summary>
    public void OnHit(Transform attacker)
    {
        if (IsDead) return;
        Target = attacker;
        _behavior.ReactToHit(this);
    }

    /// <summary>Called by CallHelpState on nearby NPCs.</summary>
    public void RespondToCall(Transform target)
    {
        if (IsDead) return;
        Target = target;
        ChangeState(new FightState());
    }

    private void HandleDeath()
    {
        IsDead = true;
        Agent.isStopped = true;
        EnableRagdoll();
        EventBus.RaiseNPCDied(gameObject);
    }

    public void EnableRagdoll()
    {
        if (_animator != null) _animator.enabled = false;
        Agent.enabled = false;
        foreach (var rb  in _ragdollBodies)    rb.isKinematic = false;
        foreach (var col in _ragdollColliders) col.enabled    = true;
    }

    private void DisableRagdoll()
    {
        foreach (var rb  in _ragdollBodies)    rb.isKinematic = true;
        foreach (var col in _ragdollColliders) col.enabled    = false;
        // Re-enable the root capsule collider so NavMesh works
        var rootCollider = GetComponent<Collider>();
        if (rootCollider != null) rootCollider.enabled = true;
    }
}
```

- [ ] **Step 4: Commit**
```bash
git add Assets/Scripts/NPC/NPCController.cs Assets/Scripts/NPC/AIBehaviorComponent.cs Assets/Scripts/NPC/NPCProximityDetector.cs
git commit -m "feat: add NPCController, AIBehaviorComponent, and NPCProximityDetector"
```

---

## Task 10: Basic Scene Setup in Unity Editor

This task is done entirely in the Unity Editor. No coding.

- [ ] **Step 1: Open CityScene**

File → New Scene → Save as `Assets/Scenes/CityScene.unity`

- [ ] **Step 2: Setup terrain**
- Add a Plane (3D Object → Plane), scale to (10, 1, 10) for a large ground
- Add a few 3D Cube objects as placeholder buildings (scale ~3×5×3), scatter them around

- [ ] **Step 3: Create Managers GameObject**
- Create empty GameObject → name it `Managers`
- Add components: `GameManager`, `SpawnManager`, `InputManager`

- [ ] **Step 4: Create Player prefab**
- Create empty GameObject → name `Player` → tag it `Player`
- Add components: `CharacterController`, `PlayerController`, `HealthComponent`, `WeaponComponent`
- Create child empty → name `CameraRoot` → add `CameraController` → set its `Target` field to Player's transform

- [ ] **Step 5: Add Fists weapon to Player**
- Create empty GameObject → name `Fists` → add `MeleeWeapon` → set Damage to 25, Range to 1.8
- Drag `Fists` into Player's `WeaponComponent → Weapon Slots [0]`
- In `WeaponComponent`, set `Hit Layers` to include `Default` and any enemy layer

- [ ] **Step 6: Bake NavMesh**
- Window → AI → Navigation → Bake tab → click **Bake**
- The ground plane must have `Navigation Static` checked (Inspector → top-right Static dropdown)

- [ ] **Step 7: Create NPC prefab (Aggressive)**
- Create a Capsule (3D Object → Capsule) → name `NPC_Aggressive`
- Add components: `NavMeshAgent`, `HealthComponent` (max health: 60), `NPCController`, `AIBehaviorComponent`
- In `AIBehaviorComponent`, set `Behavior Type` to **Aggressive**
- Create a child empty → name `ProximityDetector` → add `NPCProximityDetector` (radius: 6)
- Set up Ragdoll: select NPC → GameObject menu → 3D Object → Ragdoll Wizard → assign bones (Hips, Spine, Chest, Head, Arms, Legs) → Create
- Save as `Assets/Prefabs/NPC_Aggressive.prefab`

- [ ] **Step 8: Add Respawn Points**
- Create 4-6 empty GameObjects scattered around the scene → name them `RespawnPoint_1` etc.
- In `SpawnManager`: assign `Player Transform` and drag all RespawnPoints into `Respawn Points` array

- [ ] **Step 9: Verify Player tag is set**

Select the Player GameObject in the Hierarchy → top of Inspector → Tag → set to `Player`.
This is required for `NPCProximityDetector`'s trigger to recognize the player.

- [ ] **Step 10: Commit**
```bash
git add Assets/Scenes/CityScene.unity Assets/Prefabs/
git commit -m "feat: add basic city scene, player setup, NPC_Aggressive prefab, respawn points"
```

---

## Task 11: Integration Test — Full Combat Loop

This is a manual play test in the Unity Editor.

- [ ] **Step 1: Press Play in Unity**

- [ ] **Step 2: Test player movement**
- WASD should move the player
- Mouse should rotate the camera and player yaw
- Hold Shift → runs faster

- [ ] **Step 3: Test attacking NPC**
- Walk up to the NPC capsule
- Left-click (punch)
- NPC should take damage (check Console logs or add a `Debug.Log` to `TakeDamage`)
- After ~3 punches (HealthComponent starts at 60), NPC should ragdoll and fall

- [ ] **Step 4: Test NPC fighting back (Aggressive)**
- NPC should start running toward player when within proximity (6 units)
- NPC should punch player every 1.5 seconds
- Player health (100) should decrease

- [ ] **Step 5: Test player death and respawn**
- Let the NPC punch you until health reaches 0
- `HandleDeath()` fires → `PlayerController` disables → `EventBus.OnPlayerDied` fires
- After 3 seconds: player should teleport to a random RespawnPoint and regain full health
- `PlayerController` re-enables

- [ ] **Step 6: Fix any issues found during playtest**

Common issues:
- Camera clips through buildings → increase `offset.z` in CameraController
- Player floats → check CharacterController height and center values
- NPC doesn't move → check NavMesh was baked and NPC is on NavMesh surface
- NPC ragdoll doesn't work → check Ragdoll Wizard bone assignments

- [ ] **Step 7: Final commit**
```bash
git add -A
git commit -m "feat: Phase 1 MVP complete — player movement, combat, NPC AI, health, respawn"
```

---

## Verification Checklist

| Behavior | Expected |
|---|---|
| Player moves with WASD | ✅ |
| Camera follows with mouse | ✅ |
| Sprint with Shift | ✅ |
| Left click punches | ✅ |
| Aggressive NPC takes damage | ✅ |
| NPC dies after ~3 hits → ragdoll | ✅ |
| NPC chases and hits player | ✅ |
| Player health decreases from NPC hits | ✅ |
| Player dies → disabled for 3s | ✅ |
| Player respawns at random location with full health | ✅ |

---

## Next: Phase 2 Plan

Phase 2 adds: all 4 NPC types, Social call-for-help, ranged weapons, ammo system, weapon pickups. A separate plan file will be created for Phase 2.
