package be.ucll.se.courses.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "contact_name")
    private String contactName;

    private String email;

    private String phone;

    /** Days between ordering and delivery, used to suggest an expected date. */
    @Column(name = "lead_time_days", nullable = false)
    private int leadTimeDays = 2;

    protected Supplier() {}

    public Supplier(String name, String contactName, String email, String phone, int leadTimeDays) {
        this.name = name;
        this.contactName = contactName;
        this.email = email;
        this.phone = phone;
        this.leadTimeDays = leadTimeDays;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public int getLeadTimeDays() { return leadTimeDays; }
    public void setLeadTimeDays(int leadTimeDays) { this.leadTimeDays = leadTimeDays; }
}
